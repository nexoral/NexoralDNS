/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

export class DNSPacketCodec {
  static buildResponsePayload(
    msg: Buffer,
    domain: string,
    ResponseIP: string,
    ttl: number
  ): Buffer {
    const transactionId = msg.subarray(0, 2);
    const flags = Buffer.from([0x81, 0x80]);
    const qdcount = Buffer.from([0x00, 0x01]);
    let ancount = Buffer.from([0x00, 0x01]);
    const nscount = Buffer.from([0x00, 0x00]);
    const arcount = Buffer.from([0x00, 0x00]);

    let offset = 12;
    const labels: string[] = [];
    while (msg[offset] !== 0) {
      const length = msg[offset];
      labels.push(msg.subarray(offset + 1, offset + 1 + length).toString());
      offset += length + 1;
    }
    const queryName = labels.join(".");
    const question = msg.subarray(12, offset + 5);

    let answer = Buffer.alloc(0);
    if (queryName === domain) {
      const name = Buffer.from([0xc0, 0x0c]);
      const type = Buffer.from([0x00, 0x01]);
      const cls = Buffer.from([0x00, 0x01]);
      const ttlBuffer = Buffer.alloc(4);
      ttlBuffer.writeUInt32BE(ttl, 0);
      const rdlength = Buffer.from([0x00, 0x04]);
      const rdata = Buffer.from(ResponseIP.split(".").map((o) => parseInt(o)));
      answer = Buffer.concat([name, type, cls, ttlBuffer, rdlength, rdata]);
    } else {
      ancount = Buffer.from([0x00, 0x00]);
    }

    return Buffer.concat([
      transactionId, flags, qdcount, ancount, nscount, arcount, question, answer,
    ]);
  }

  static parseQueryName(msg: Buffer, offset = 12): string {
    const labels: string[] = [];
    let jumped = false;
    let jumpOffset = 0;

    while (true) {
      const length = msg[offset];

      if (length === 0) {
        if (!jumped) offset++;
        break;
      }

      if ((length & 0xC0) === 0xC0) {
        if (!jumped) jumpOffset = offset + 2;
        offset = ((length & 0x3F) << 8) | msg[offset + 1];
        jumped = true;
        continue;
      }

      labels.push(msg.subarray(offset + 1, offset + 1 + length).toString());
      offset += length + 1;
    }

    return labels.join(".");
  }

  static parseQueryType(msg: Buffer): string {
    let offset = 12;
    while (msg[offset] !== 0) {
      const length = msg[offset];
      offset += length + 1;
    }
    offset += 1;
    const qtype = msg.readUInt16BE(offset);
    switch (qtype) {
      case 1:
        return "A";
      case 2:
        return "NS";
      case 5:
        return "CNAME";
      case 6:
        return "SOA";
      case 12:
        return "PTR";
      case 15:
        return "MX";
      case 16:
        return "TXT";
      case 28:
        return "AAAA";
      default:
        return `Unknown (${qtype})`;
    }
  }

  static parseDNSResponse(response: Buffer, queryType: string): { type: string; name: string; value: string; ttl: number } | null {
    try {
      let offset = 12;

      const qdcount = response.readUInt16BE(4);
      for (let i = 0; i < qdcount; i++) {
        while (offset < response.length && response[offset] !== 0) {
          if ((response[offset] & 0xC0) === 0xC0) {
            offset += 2;
            break;
          }
          offset += response[offset] + 1;
        }
        if (response[offset] === 0) offset++;
        offset += 4;
      }

      const ancount = response.readUInt16BE(6);
      if (ancount === 0) return null;

      const name = this.parseQueryName(response, offset);

      if ((response[offset] & 0xC0) === 0xC0) {
        offset += 2;
      } else {
        while (offset < response.length && response[offset] !== 0) {
          offset += response[offset] + 1;
        }
        offset++;
      }

      const type = response.readUInt16BE(offset);
      offset += 4;

      const ttl = response.readUInt32BE(offset);
      offset += 4;

      const rdlength = response.readUInt16BE(offset);
      offset += 2;

      let value = "";
      if (type === 1 && rdlength === 4) {
        value = `${response[offset]}.${response[offset + 1]}.${response[offset + 2]}.${response[offset + 3]}`;
      } else if (type === 28 && rdlength === 16) {
        const parts = [];
        for (let i = 0; i < 8; i++) {
          parts.push(response.readUInt16BE(offset + i * 2).toString(16));
        }
        value = parts.join(":");
      }

      if (!value) return null;

      return {
        type: queryType,
        name: name,
        value: value,
        ttl: ttl
      };
    } catch (error) {
      return null;
    }
  }
}
