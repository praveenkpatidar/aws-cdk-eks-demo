import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';

export interface PrometheusKubeStackProps extends cdk.StackProps {
    cluster: eks.Cluster;
}

export class PrometheusKubeStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: PrometheusKubeStackProps) {
        super(scope, id, props);

        const { cluster } = props;

        // Deploy the Prometheus Kube Stack using Helm
        cluster.addHelmChart('PrometheusKubeStack', {
            chart: 'kube-prometheus-stack',
            repository: 'https://prometheus-community.github.io/helm-charts',
            namespace: 'monitoring',
            release: 'prometheus-kube-stack',
            values: {
                defaultRules: {
                    create: true,
                },
                prometheus: {
                    prometheusSpec: {
                        serviceMonitorSelector: {},
                    },
                },
                alertmanager: {
                    alertmanagerSpec: {
                        serviceMonitorSelector: {},
                    },
                },
                grafana: {
                    enabled: true,
                    adminPassword: 'admin', // Change the password as needed
                },
            },
        });
    }
}
