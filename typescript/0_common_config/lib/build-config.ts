// Update the config according to yaml structure
export interface BuildConfig {
    readonly AWSAccountID: string;
    readonly AWSProfileName: string;
    readonly AWSProfileRegion: string;
    readonly App: string;
    readonly Environment: string;
    readonly Networking: Networking;
    readonly Project: string;
    readonly Version: string;
}
export interface Networking {
    readonly EKSTags?: boolean;
    readonly VPCCidr: string;
}
