    import { SerialPortStream } from '@serialport/stream';
    import { SerialPort } from 'serialport'; // meta import for bindings auto-detect; not strictly needed in stream mode
    import { list as listPortsLib } from '@serialport/list';

    const openPorts = new Map<string, SerialPortStream>();

    export async function list() {
      const ports = await listPortsLib();
      return ports.map(p => ({
        path: p.path,
        manufacturer: p.manufacturer,
        serialNumber: p.serialNumber,
      }));
    }

    export function open(opts: { path: string; baudRate: number; dataBits?: 7|8; parity?: 'none'|'even'|'odd'; stopBits?: 1|2 }) {
      const id = `${opts.path}`;
      const port = new SerialPortStream({ path: opts.path, baudRate: opts.baudRate, dataBits: opts.dataBits ?? 8, parity: opts.parity ?? 'none', stopBits: opts.stopBits ?? 1 });
      openPorts.set(id, port);
      return { handleId: id };
    }

    export function write(handleId: string, data: string | Uint8Array) {
      const port = openPorts.get(handleId);
      if (!port) throw new Error('Port not open');
      const buf = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
      return new Promise((resolve, reject) => {
        port.write(buf, (err) => err ? reject(err) : resolve({ bytes: buf.byteLength }));
      });
    }

    export function read(_handleId: string) {
      // In a real app you'd set up on('data') and bridge via ipc. Here we return empty.
      return new Uint8Array();
    }

    export function close(handleId: string) {
      const port = openPorts.get(handleId);
      if (port) {
        port.close();
        openPorts.delete(handleId);
      }
    }
    