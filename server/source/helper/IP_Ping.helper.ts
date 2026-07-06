import {exec} from "child_process";

export function pingIP(ip: string): Promise<boolean> {
    return new Promise((resolve) => {
        exec(`ping -c 1 -W 1 ${ip}`, (error, stdout, stderr) => {
            if (error) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}