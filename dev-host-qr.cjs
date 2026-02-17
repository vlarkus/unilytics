const net = require("net");
const os = require("os");

const DEV_PORT = process.env.VITE_PORT || "5173";
const args = process.argv.slice(2);
const shouldWait = args.includes("--wait");
const repeatArgIndex = args.indexOf("--repeat");
const intervalArgIndex = args.indexOf("--interval"); 
const repeatCount =
  repeatArgIndex >= 0
    ? Math.max(1, Number.parseInt(args[repeatArgIndex + 1] || "1", 10) || 1)
    : 1;
const intervalMs =
  intervalArgIndex >= 0
    ? Math.max(0, Number.parseInt(args[intervalArgIndex + 1] || "3000", 10) || 3000)
    : 3000;

const isPrivateIPv4 = (ip) =>
  /^10\./.test(ip) ||
  /^192\.168\./.test(ip) ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);

const getLanAddress = () => {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  Object.values(interfaces).forEach((iface) => {
    (iface || []).forEach((addressInfo) => {
      if (!addressInfo || addressInfo.family !== "IPv4" || addressInfo.internal) {
        return;
      }
      candidates.push(addressInfo.address);
    });
  });

  if (candidates.length === 0) return null;
  const privateIp = candidates.find(isPrivateIPv4);
  return privateIp || candidates[0];
};

const host = getLanAddress() || "localhost";
const url = `http://${host}:${DEV_PORT}`;

const printQr = () => {
  const separator = "=".repeat(52);
  console.log(`\n${separator}`);
  console.log("Unilytics Host Dev URL");
  console.log(url);
  console.log(separator);

  try {
    const qrcode = require("qrcode-terminal");
    qrcode.generate(url, { small: true });
    console.log("Scan this QR code from your phone on the same network.\n");
  } catch {
    console.log(
      "QR package not installed yet. Run `pnpm install` once to enable terminal QR output.\n",
    );
  }
};

const waitForPort = (port, hostAddress = "127.0.0.1", timeoutMs = 120000) =>
  new Promise((resolve, reject) => {
    const start = Date.now();

    const tryConnect = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);

      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });

      socket.once("timeout", () => {
        socket.destroy();
        retryOrFail();
      });

      socket.once("error", () => {
        socket.destroy();
        retryOrFail();
      });

      socket.connect(Number(port), hostAddress);
    };

    const retryOrFail = () => {
      if (Date.now() - start >= timeoutMs) {
        reject(new Error(`Timed out waiting for localhost:${port}`));
        return;
      }
      setTimeout(tryConnect, 500);
    };

    tryConnect();
  });

const run = async () => {
  if (shouldWait) {
    try {
      await waitForPort(DEV_PORT);
    } catch (error) {
      console.error(
        `Could not detect dev server on port ${DEV_PORT}. Printing QR anyway.`,
      );
    }
  }

  for (let i = 0; i < repeatCount; i += 1) {
    printQr();
    if (i < repeatCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
};

void run();
