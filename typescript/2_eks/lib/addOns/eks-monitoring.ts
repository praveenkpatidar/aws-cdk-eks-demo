import * as cdk from "aws-cdk-lib";
import { lookUpEksCluster } from "../../utils/getEksCluster";
import { CommonStackProps, coreTolerations } from "../../utils/constants";

export interface MonitoringStackProps extends CommonStackProps { }

export class MonitoringStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: MonitoringStackProps) {
    super(scope, id, props);
    const namePrefix = `${props.commonConfig.app}-${props.buildConfig.environment}`;
    const cluster = lookUpEksCluster(this, namePrefix);
    const eksConfig = props.buildConfig.eksConfig;

    // Create Persistent StorageClass for Prometheus
    cluster.addManifest('PrometheusStorageClass', {
      apiVersion: 'storage.k8s.io/v1',
      kind: 'StorageClass',
      metadata: { name: 'prometheus-sc' },
      provisioner: 'efs.csi.aws.com', // Using EFS storage (or update based on your setup)
      parameters: {
        provisioningMode: 'efs-ap',
        directoryPerms: '700',
        fileSystemId: cdk.Fn.importValue('EfsFileSystemId'), // Import EFS FileSystem ID
      },
    });
    // Deploy the Metrics Server Kube Stack using Helm
    cluster.addHelmChart("MetricsServer", {
      chart: "metrics-server",
      repository: "https://kubernetes-sigs.github.io/metrics-server/",
      namespace: "monitoring",
      release: "metrics-server",
      version: eksConfig.eksAddOns.metricsServer.version,
      values: {
        args: ["--kubelet-preferred-address-types=InternalIP"],
        tolerations: [coreTolerations],
      },
    });
    // Deploy the Prometheus Kube Stack using Helm
    cluster.addHelmChart("PrometheusKubeStack", {
      chart: "kube-prometheus-stack",
      repository: "https://prometheus-community.github.io/helm-charts",
      namespace: "monitoring",
      release: "prometheus-kube-stack",
      version: eksConfig.eksAddOns.kubePrometheusStack.version,
      // configure ingress for grafana based on ingress controller or else port-forward will work
      // configure notifications\emails and other monitoring configuration here.
      values: {
        defaultRules: {
          create: true,
        },
        "kube-state-metrics": {
          tolerations: [coreTolerations],
        },
        prometheusOperator: {
          tolerations: [coreTolerations],
          admissionWebhooks: {
            deployment: {
              tolerations: [coreTolerations],
            },
            patch: {
              tolerations: [coreTolerations],
            }
          }
        },
        prometheus: {
          prometheusSpec: {
            retention: '30d', // Retain metrics for 30 days
            storageSpec: {
              volumeClaimTemplate: {
                spec: {
                  storageClassName: 'prometheus-sc',
                  accessModes: ['ReadWriteMany'], // EFS or NFS storage
                  resources: {
                    requests: {
                      storage: '50Gi', // Adjust storage size as needed
                    },
                  },
                },
              },
            },
            serviceMonitorSelector: {},
            tolerations: [coreTolerations],
          },
        },
        alertmanager: {
          alertmanagerSpec: {
            serviceMonitorSelector: {},
            tolerations: [coreTolerations],
          },
        },
        grafana: {
          tolerations: [coreTolerations],
          enabled: true,
        },
      },
    });
  }
}