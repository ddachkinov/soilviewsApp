#!/usr/bin/env node
/**
 * SoilViews Cost Estimator
 *
 * Calculates estimated cost per hectare for SoilViews platform.
 * Target: < €0.10/ha/year at national scale (1M ha)
 *
 * Usage:
 *   node cost-estimator.js --hectares 1000000 --region eu-central-1
 */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('hectares', {
    type: 'number',
    description: 'Total hectares to estimate',
    default: 1000000,
  })
  .option('region', {
    type: 'string',
    description: 'AWS region',
    default: 'eu-central-1',
  })
  .option('months', {
    type: 'number',
    description: 'Number of months',
    default: 12,
  }).argv;

// AWS Pricing (eu-central-1, USD converted to EUR @ 0.92)
const PRICING = {
  // EKS
  eks_cluster: 73 * 0.92, // €67/month
  eks_node_m5_large_spot: 0.0416 * 730 * 0.92, // €28/month per node
  eks_node_m5_large_ondemand: 0.104 * 730 * 0.92, // €70/month per node

  // RDS PostgreSQL
  rds_t4g_medium: 0.082 * 730 * 0.92, // €55/month
  rds_storage_gp3: 0.138 * 0.92, // €0.127/GB/month

  // S3
  s3_standard: 0.024 * 0.92, // €0.022/GB/month
  s3_intelligent_tiering: 0.0125 * 0.92, // €0.0115/GB/month

  // Lambda
  lambda_arm_request: 0.0000002 * 0.92, // €0.00000018 per request
  lambda_arm_gb_second: 0.0000133334 * 0.92, // €0.0000123/GB-second
  lambda_provisioned_concurrency: 0.0000041667 * 0.92, // €0.0000038/GB-second

  // EFS
  efs_standard: 0.33 * 0.92, // €0.30/GB/month

  // Data Transfer
  cloudfront: 0.085 * 0.92, // €0.078/GB

  // CloudWatch
  cloudwatch_metrics: 0.30 * 0.92, // €0.28 per metric/month
  cloudwatch_logs: 0.57 * 0.92, // €0.52/GB ingested
};

console.log('🌾 SoilViews Cost Estimator\n');
console.log(`Configuration:`);
console.log(`  - Hectares: ${argv.hectares.toLocaleString()}`);
console.log(`  - Region: ${argv.region}`);
console.log(`  - Period: ${argv.months} months\n`);

// Calculate costs
const costs = {
  // EKS: 1 cluster + 3 m5.large spot nodes
  eks:
    PRICING.eks_cluster +
    PRICING.eks_node_m5_large_spot * 3,

  // RDS: t4g.medium + 100 GB storage
  rds: PRICING.rds_t4g_medium + PRICING.rds_storage_gp3 * 100,

  // S3: 5 TB of COGs (with lifecycle to Intelligent-Tiering)
  s3:
    PRICING.s3_standard * 1000 * 0.3 + // 30% in Standard
    PRICING.s3_intelligent_tiering * 1000 * 0.7, // 70% in Intelligent-Tiering

  // Lambda: 100K inferences/month @ 20s each, 10 GB memory
  lambda:
    PRICING.lambda_arm_request * 100000 +
    PRICING.lambda_arm_gb_second * 100000 * 20 * 10 +
    PRICING.lambda_provisioned_concurrency * 2 * 10 * 730 * 3600, // 2 warm instances

  // EFS: 1 GB for model cache
  efs: PRICING.efs_standard * 1,

  // Data Transfer: 500 GB/month via CloudFront
  dataTransfer: PRICING.cloudfront * 500,

  // CloudWatch: 50 metrics + 10 GB logs
  cloudwatch:
    PRICING.cloudwatch_metrics * 50 + PRICING.cloudwatch_logs * 10,
};

const totalMonthly = Object.values(costs).reduce((a, b) => a + b, 0);
const totalYearly = totalMonthly * argv.months;
const costPerHectarePerYear = totalYearly / argv.hectares;
const costPerHectarePerMonth = totalMonthly / argv.hectares;

console.log('Monthly Cost Breakdown:');
console.log(`  EKS (cluster + 3 spot nodes):  €${costs.eks.toFixed(2)}`);
console.log(`  RDS PostgreSQL (t4g.medium):   €${costs.rds.toFixed(2)}`);
console.log(`  S3 (5 TB COGs):                €${costs.s3.toFixed(2)}`);
console.log(`  Lambda (ARM, 10 GB):           €${costs.lambda.toFixed(2)}`);
console.log(`  EFS (1 GB model cache):        €${costs.efs.toFixed(2)}`);
console.log(`  Data Transfer (CloudFront):    €${costs.dataTransfer.toFixed(2)}`);
console.log(`  CloudWatch (logs + metrics):   €${costs.cloudwatch.toFixed(2)}`);
console.log(`  ${'─'.repeat(40)}`);
console.log(`  Total Monthly:                 €${totalMonthly.toFixed(2)}`);
console.log(`  Total Yearly:                  €${totalYearly.toFixed(2)}\n`);

console.log('Cost per Hectare:');
console.log(`  Per Month:  €${costPerHectarePerMonth.toFixed(6)}`);
console.log(`  Per Year:   €${costPerHectarePerYear.toFixed(6)}\n`);

const TARGET_COST = 0.1;
const isUnderTarget = costPerHectarePerYear <= TARGET_COST;

console.log(`Target: €${TARGET_COST.toFixed(2)}/ha/year`);
console.log(
  `Status: ${isUnderTarget ? '✅ UNDER' : '❌ OVER'} target (${((costPerHectarePerYear / TARGET_COST) * 100).toFixed(1)}%)\n`
);

if (!isUnderTarget) {
  console.log('💡 Cost Optimization Recommendations:');
  console.log('  1. Use RDS Reserved Instances (40% savings)');
  console.log('  2. Increase Spot instance usage to 100% (70% savings)');
  console.log('  3. Reduce Lambda provisioned concurrency (€55/mo savings)');
  console.log('  4. Implement S3 lifecycle to Glacier after 180 days');
  console.log('  5. Reduce CloudWatch logs retention to 3 days\n');
}

console.log('Note: Costs exclude:');
console.log('  - Sentinel-Hub API fees (€0.10-0.25 per km²)');
console.log('  - Domain registration and SSL certificates');
console.log('  - Third-party services (Sentry, Unleash SaaS, etc.)');
