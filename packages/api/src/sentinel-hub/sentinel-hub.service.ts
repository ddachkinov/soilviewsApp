import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sentinel Hub Process API service.
 * Fetches bare-soil composites for ML inference.
 * Referenced in ADR-002 (Sentinel Hub selection).
 */
@Injectable()
export class SentinelHubService {
  private readonly logger = new Logger(SentinelHubService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly s3: AWS.S3;
  private accessToken: string;
  private tokenExpiresAt: number;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get('SENTINEL_HUB_CLIENT_ID');
    this.clientSecret = this.configService.get('SENTINEL_HUB_CLIENT_SECRET');
    this.baseUrl = this.configService.get('SENTINEL_HUB_BASE_URL', 'https://services.sentinel-hub.com');

    this.s3 = new AWS.S3({
      region: this.configService.get('AWS_REGION'),
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
    });
  }

  /**
   * Get OAuth access token for Sentinel Hub.
   * Tokens are cached until expiration.
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.accessToken && this.tokenExpiresAt && now < this.tokenExpiresAt) {
      return this.accessToken;
    }

    this.logger.log('Fetching new Sentinel Hub access token');

    try {
      const response = await axios.post(
        `${this.baseUrl}/oauth/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = now + response.data.expires_in * 1000 - 60000; // Refresh 1 min early

      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get Sentinel Hub access token', error.response?.data || error.message);
      throw new BadRequestException('Failed to authenticate with Sentinel Hub');
    }
  }

  /**
   * Fetch Sentinel-2 bare-soil composite.
   * Uses median composite method for cloud-free imagery.
   * Time window: March 15 - April 30 (Bulgarian bare-soil season).
   */
  async fetchBareSoilComposite(params: {
    geometry: any; // GeoJSON Polygon
    startDate: string; // ISO date
    endDate: string; // ISO date
    maxCloudCover: number;
    resolution: number;
  }): Promise<{ cogUrl: string; acquisitionDates: string[]; cloudCover: number }> {
    const token = await this.getAccessToken();

    // Evalscript for 8-band Sentinel-2 L2A composite
    const evalscript = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B02", "B03", "B04", "B05", "B06", "B07", "B08", "B8A", "SCL"],
      units: "REFLECTANCE"
    }],
    output: {
      id: "default",
      bands: 8,
      sampleType: "UINT16"
    }
  };
}

function evaluatePixel(samples) {
  // Filter out clouds, cloud shadows, water (SCL-based masking)
  let validSamples = samples.filter(s =>
    s.SCL !== 3 && s.SCL !== 8 && s.SCL !== 9 && s.SCL !== 10 && s.SCL !== 11
  );

  if (validSamples.length === 0) {
    return [0, 0, 0, 0, 0, 0, 0, 0];
  }

  // Median composite
  let medianSample = validSamples[Math.floor(validSamples.length / 2)];

  return [
    medianSample.B02 * 10000,
    medianSample.B03 * 10000,
    medianSample.B04 * 10000,
    medianSample.B05 * 10000,
    medianSample.B06 * 10000,
    medianSample.B07 * 10000,
    medianSample.B08 * 10000,
    medianSample.B8A * 10000
  ];
}
`;

    const requestBody = {
      input: {
        bounds: {
          geometry: params.geometry,
          properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
        },
        data: [
          {
            type: 'sentinel-2-l2a',
            dataFilter: {
              timeRange: {
                from: `${params.startDate}T00:00:00Z`,
                to: `${params.endDate}T23:59:59Z`,
              },
              maxCloudCoverage: params.maxCloudCover,
              mosaickingOrder: 'leastCC', // Least cloud cover first
            },
          },
        ],
      },
      output: {
        width: Math.ceil(this.calculateWidth(params.geometry, params.resolution)),
        height: Math.ceil(this.calculateHeight(params.geometry, params.resolution)),
        responses: [
          {
            identifier: 'default',
            format: { type: 'image/tiff' },
          },
        ],
      },
      evalscript,
    };

    this.logger.log(
      `Fetching Sentinel-2 composite for ${params.startDate} to ${params.endDate}, max cloud: ${params.maxCloudCover}%`,
    );

    try {
      const response = await axios.post(`${this.baseUrl}/api/v1/process`, requestBody, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      });

      // Upload to S3 as COG
      const bucket = this.configService.get('S3_COMPOSITES_BUCKET');
      const key = `sentinel2/${uuidv4()}.tif`;

      await this.s3
        .putObject({
          Bucket: bucket,
          Key: key,
          Body: response.data,
          ContentType: 'image/tiff',
          Metadata: {
            'start-date': params.startDate,
            'end-date': params.endDate,
            'max-cloud-cover': params.maxCloudCover.toString(),
          },
        })
        .promise();

      const cogUrl = `s3://${bucket}/${key}`;

      this.logger.log(`Sentinel-2 composite uploaded to ${cogUrl}`);

      return {
        cogUrl,
        acquisitionDates: [params.startDate, params.endDate],
        cloudCover: params.maxCloudCover,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Sentinel-2 composite', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch satellite imagery from Sentinel Hub');
    }
  }

  /**
   * Fetch Sentinel-1 SAR composite.
   * Provides VV and VH polarization bands.
   */
  async fetchSentinel1Composite(params: {
    geometry: any;
    startDate: string;
    endDate: string;
    resolution: number;
  }): Promise<{ cogUrl: string }> {
    const token = await this.getAccessToken();

    const evalscript = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["VV", "VH"]
    }],
    output: {
      id: "default",
      bands: 2,
      sampleType: "FLOAT32"
    }
  };
}

function evaluatePixel(samples) {
  let vvSum = 0, vhSum = 0, count = 0;

  for (let i = 0; i < samples.length; i++) {
    vvSum += samples[i].VV;
    vhSum += samples[i].VH;
    count++;
  }

  return [vvSum / count, vhSum / count];
}
`;

    const requestBody = {
      input: {
        bounds: {
          geometry: params.geometry,
          properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
        },
        data: [
          {
            type: 'sentinel-1-grd',
            dataFilter: {
              timeRange: {
                from: `${params.startDate}T00:00:00Z`,
                to: `${params.endDate}T23:59:59Z`,
              },
              acquisitionMode: 'IW',
              polarization: 'DV', // Dual VV+VH
            },
          },
        ],
      },
      output: {
        width: Math.ceil(this.calculateWidth(params.geometry, params.resolution)),
        height: Math.ceil(this.calculateHeight(params.geometry, params.resolution)),
        responses: [
          {
            identifier: 'default',
            format: { type: 'image/tiff' },
          },
        ],
      },
      evalscript,
    };

    try {
      const response = await axios.post(`${this.baseUrl}/api/v1/process`, requestBody, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      });

      // Upload to S3
      const bucket = this.configService.get('S3_COMPOSITES_BUCKET');
      const key = `sentinel1/${uuidv4()}.tif`;

      await this.s3
        .putObject({
          Bucket: bucket,
          Key: key,
          Body: response.data,
          ContentType: 'image/tiff',
        })
        .promise();

      const cogUrl = `s3://${bucket}/${key}`;

      this.logger.log(`Sentinel-1 composite uploaded to ${cogUrl}`);

      return { cogUrl };
    } catch (error) {
      this.logger.error('Failed to fetch Sentinel-1 composite', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Calculate output width based on geometry and resolution.
   */
  private calculateWidth(geometry: any, resolution: number): number {
    const coords = geometry.coordinates[0];
    const lons = coords.map((c: number[]) => c[0]);
    const lonSpan = Math.max(...lons) - Math.min(...lons);

    // Approximate: 1 degree longitude ≈ 111km at 42°N latitude
    const widthMeters = lonSpan * 111000 * Math.cos((42 * Math.PI) / 180);

    return widthMeters / resolution;
  }

  /**
   * Calculate output height based on geometry and resolution.
   */
  private calculateHeight(geometry: any, resolution: number): number {
    const coords = geometry.coordinates[0];
    const lats = coords.map((c: number[]) => c[1]);
    const latSpan = Math.max(...lats) - Math.min(...lats);

    // 1 degree latitude ≈ 111km
    const heightMeters = latSpan * 111000;

    return heightMeters / resolution;
  }
}
