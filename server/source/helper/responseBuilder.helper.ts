/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import { ResponseBuilder } from "../Interfaces/ResponseBuilder.interface";

/**
 * A utility class to build and send HTTP responses using Fastify.
 */
export default class ResponseSender {
  private readonly fastifyResponse: FastifyReply
  private statusCode?: number;
  private message?: string;
  private data?: any;

  /**
   * Creates a new instance of the response builder.
   * @param fastifyResponse - The Fastify reply object used to send the HTTP response.
   * @param statusCode - Optional HTTP status code for the response.
   * @param message - Optional message to include in the response.
   * @param data - Optional data payload to include in the response.
   */
  constructor(fastifyResponse: FastifyReply, statusCode?: number, message?: string, data?: any) {
    this.fastifyResponse = fastifyResponse;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  /**
   * Sets the HTTP status code for the response.
   * 
   * @param statusCode - The HTTP status code to set (e.g., 200, 404, 500)
   * @returns The current ResponseSender instance for method chaining
   */
  public setStatusCode(statusCode: number): ResponseSender {
    this.statusCode = statusCode;
    return this;
  }

  /**
   * Sets the response message.
   * 
   * @param message - The message to be set in the response
   * @returns The current ResponseSender instance for method chaining
   */
  public setMessage(message: string): ResponseSender {
    this.message = message;
    return this;
  }

  /**
   * Sets the data for the response.
   * @param data - The data to be included in the response. Can be of any type.
   * @returns {ResponseSender} The current instance of ResponseSender for method chaining.
   */
  public setData(data: any): ResponseSender {
    this.data = data;
    return this;
  }

  /**
   * Constructs a standardized response object.
   * 
   * @param statusCode - The HTTP status code for the response.
   * @param message - A descriptive message about the response.
   * @param data - Optional data payload to include in the response.
   * @returns A ResponseBuilder object containing the status code, message, and optional data.
   */
  private buildResponse(statusCode: number, message: string, data?: any): ResponseBuilder {
    return {
      statusCode,
      message,
      data: data || null,
    };
  }

  /**
   * Sends the response to the client.
   * Combines the status code, message, and data into a structured response format.
   * 
   * @param data - The data to include in the response. If this.data is already set, it will be used instead.
   * @param statusCode - The HTTP status code to send. Defaults to this.statusCode, or StatusCodes.OK (200) if neither is set.
   * @returns void
   * 
   * @example
   * // Send a simple success response with data
   * responseBuilder.send({ user: userData });
   * 
   * @example
   * // Send a response with a specific status code
   * responseBuilder.send(null, StatusCodes.CREATED);
   */
  public send(data: any, statusCode?: number, message?: string): void {
    this.fastifyResponse.status(this.statusCode || statusCode || StatusCodes.OK).send(
      this.buildResponse(
        this.statusCode || statusCode || StatusCodes.OK,
        this.message || message || "Success",
        this.data || data,
      ),
    );
  }
}