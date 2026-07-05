import { execFile } from "child_process";

export function pingIP(ip: string): Promise<boolean> {
    // execFile with an argument array avoids shell interpolation, so an untrusted
    // IP value can never be used for command injection.
    return new Promise((resolve) => {
        execFile("ping", ["-c", "1", "-W", "1", ip], (error) => {
            resolve(!error);
        });
    });
}