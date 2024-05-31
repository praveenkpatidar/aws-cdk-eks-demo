// Update the config according to yaml structure
export interface Config {
    App: string;
    Project: string;
    AWSAccountID: string;
    AWSProfileName: string;
    AWSProfileRegion: string;
    Environment: string;
    Eks: {
        Version: string;
        EKSVersion: string;
    }
    Networking: {
        EKSTags?: boolean;
        VPCCidr: string;
    }
}
