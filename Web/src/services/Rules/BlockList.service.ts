import InputOutputHandler from "../../utilities/IO.utls";
import dgram from "dgram"

export default class BlockList {
  private readonly IO: InputOutputHandler;
  private readonly msg: Buffer<ArrayBufferLike>;
  private readonly rinfo: dgram.RemoteInfo;
  
  constructor(IO: InputOutputHandler, msg: Buffer<ArrayBufferLike>, rinfo: dgram.RemoteInfo) {
    this.IO = IO
    this.msg = msg
    this.rinfo = rinfo
  }

  public async checkDomain(domain: string) {

  }
}