import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";


// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";
// db connections
import { getCollectionClient } from "../../Database/mongodb.db";
import { fetchConnectedIP } from "../../CronJob/Connected_IP_fetcher.cron";

export default class RouterService {
  private readonly fastifyReply: FastifyReply
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }


  // Fetch all connected IPs from the database
  public async fetchConnectedIPs(): Promise<void> {
    // construct Response
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Record fetch Successful");
    const collectionClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SERVICE);

    if (!collectionClient) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Database connection error");
      return Responser.send("Currently unable to connect to database");
    }

    const serviceConfig = await collectionClient.findOne({ SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME });
    if (!serviceConfig) {
      Responser.setStatusCode(StatusCodes.NOT_FOUND);
      Responser.setMessage("Service configuration not found");
      return Responser.send("Service configuration not found");
    }

    // delete sensitive info
    delete serviceConfig.apiKey;
    delete serviceConfig.Connected_At;
    delete serviceConfig.Disconnected_At;
    delete serviceConfig.CLOUD_URL;

    // Filter out the device with IP ending in .1 (usually the router itself)
    serviceConfig.List_of_Connected_Devices_Info = serviceConfig.List_of_Connected_Devices_Info.filter((device: any) => {
      const ipparts = device.ip.split(".");
      return device.ip.split(".")[ipparts.length - 1] !== "1"
    });

    return Responser.send(serviceConfig)
  }

  // refresh the connected IPs by calling the cron job function
  public async refreshConnectedIPs(): Promise<void> {
    // construct Response
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Record updated Successful");

    // run the cron job function
    const status = await fetchConnectedIP();

    if (!status) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Failed to update connected IPs");
      return Responser.send("Failed to update connected IPs");
    }
    else if (status === true){
      Responser.setMessage("Connected IPs updated successfully");
      return Responser.send({
        message: "Connected IPs updated successfully",
        updatedStatus: status
      });
    }

  }
}