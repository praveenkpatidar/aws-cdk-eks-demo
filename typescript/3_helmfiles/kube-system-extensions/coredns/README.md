# Installation

## Cluster DNS IP

(!) IMPORTANT! Before installing (!)

The pre-configured Kubernetes host service shipped with EKS (default kube-dns) has a ClusterIP service type which will need to be retained while using this chart. In other words, find out the clusterIP assigned to the kube-dns service and pass that IP address into this parent chart's values. The most reliable way to do this is below.

Find the DNS service ClusterIP:

```bash
k get svc -n kube-system kube-dns -o jsonpath='{.spec.clusterIP}'
```

## Cleanup

If your installing from a vanilla EKS deployment. You will need to manually cleanup the AWS EKS coredns resources.

```bash
 k delete deployment coredns
 k delete cm coredns
```

or

<https://docs.aws.amazon.com/eks/latest/userguide/managing-coredns.html#removing-coredns-eks-add-on>
