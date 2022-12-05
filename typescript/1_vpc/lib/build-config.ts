// Update the config accorning to yaml structure
export interface BuildConfig
{
    readonly AWSAccountID : string;
    readonly AWSProfileName : string;
    readonly AWSProfileRegion : string;
    readonly App : string;
    readonly Environment : string;
    readonly Version : string;
    readonly Project: string;
    readonly Networking: Networking;
}
export interface Networking {
    readonly VPCCidr: string;
}
