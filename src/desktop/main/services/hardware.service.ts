import * as os from 'os';
import * as si from 'systeminformation';
import { EventEmitter } from 'events';
import log from 'electron-log';
import { GPU } from 'gpu.js';

export class HardwareService extends EventEmitter {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private gpu: GPU | null = null;
  private readonly MONITORING_INTERVAL = 1000; // 1 second
  private readonly ALERT_THRESHOLDS = {
    cpu: 90, // 90% usage
    memory: 90, // 90% usage
    gpu: 85, // 85% usage
    temperature: 80, // 80°C
    storage: 90, // 90% usage
  };

  constructor() {
    super();
    this.initializeGPU();
  }

  private async initializeGPU() {
    try {
      this.gpu = new GPU();
      const gpuInfo = await si.graphics();
      log.info('GPU initialized:', gpuInfo);
    } catch (error) {
      log.error('Failed to initialize GPU:', error);
    }
  }

  public async initialize() {
    try {
      // Initial system check
      await this.performSystemCheck();

      // Start monitoring
      this.startMonitoring();

      log.info('Hardware monitoring service initialized');
    } catch (error) {
      log.error('Failed to initialize hardware monitoring:', error);
      throw error;
    }
  }

  public async getStats(): Promise<HardwareStats> {
    try {
      const [cpu, memory, gpu, temp, disk, network] = await Promise.all([
        this.getCPUStats(),
        this.getMemoryStats(),
        this.getGPUStats(),
        this.getTemperatureStats(),
        this.getDiskStats(),
        this.getNetworkStats(),
      ]);

      return {
        cpu,
        memory,
        gpu,
        temperature: temp,
        disk,
        network,
        timestamp: Date.now(),
      };
    } catch (error) {
      log.error('Failed to get hardware stats:', error);
      throw error;
    }
  }

  private async getCPUStats(): Promise<CPUStats> {
    const cpuLoad = await si.currentLoad();
    const cpuInfo = await si.cpu();

    return {
      usage: cpuLoad.currentLoad,
      temperature: cpuLoad.cpus.map(cpu => cpu.temperature),
      cores: os.cpus().map(core => ({
        model: core.model,
        speed: core.speed,
        times: core.times,
      })),
      info: {
        manufacturer: cpuInfo.manufacturer,
        brand: cpuInfo.brand,
        speed: cpuInfo.speed,
        cores: cpuInfo.cores,
        physicalCores: cpuInfo.physicalCores,
      },
    };
  }

  private async getMemoryStats(): Promise<MemoryStats> {
    const memInfo = await si.mem();
    const swapInfo = await si.swap();

    return {
      total: memInfo.total,
      used: memInfo.used,
      free: memInfo.free,
      swap: {
        total: swapInfo.total,
        used: swapInfo.used,
        free: swapInfo.free,
      },
      usage: (memInfo.used / memInfo.total) * 100,
    };
  }

  private async getGPUStats(): Promise<GPUStats> {
    const gpuInfo = await si.graphics();
    
    return {
      controllers: gpuInfo.controllers.map(controller => ({
        model: controller.model,
        vendor: controller.vendor,
        vram: controller.vram,
        temperature: controller.temperatureGpu,
        usage: controller.utilizationGpu,
        memoryUsage: controller.memoryUsed,
        fanSpeed: controller.fanSpeed,
      })),
    };
  }

  private async getTemperatureStats(): Promise<TemperatureStats> {
    const temp = await si.cpuTemperature();
    
    return {
      main: temp.main,
      cores: temp.cores,
      max: temp.max,
    };
  }

  private async getDiskStats(): Promise<DiskStats> {
    const diskLayout = await si.diskLayout();
    const fsSize = await si.fsSize();
    
    return {
      drives: diskLayout.map(disk => ({
        device: disk.device,
        type: disk.type,
        name: disk.name,
        size: disk.size,
        temperature: disk.temperature,
      })),
      partitions: fsSize.map(fs => ({
        fs: fs.fs,
        type: fs.type,
        size: fs.size,
        used: fs.used,
        use: fs.use,
        mount: fs.mount,
      })),
    };
  }

  private async getNetworkStats(): Promise<NetworkStats> {
    const networkStats = await si.networkStats();
    const networkInterfaces = await si.networkInterfaces();
    
    return {
      interfaces: networkInterfaces.map(iface => ({
        iface: iface.iface,
        ip4: iface.ip4,
        ip6: iface.ip6,
        mac: iface.mac,
        speed: iface.speed,
        type: iface.type,
      })),
      stats: networkStats.map(stat => ({
        interface: stat.iface,
        rxBytes: stat.rx_bytes,
        txBytes: stat.tx_bytes,
        rxErrors: stat.rx_errors,
        txErrors: stat.tx_errors,
      })),
    };
  }

  private startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        const stats = await this.getStats();
        this.checkThresholds(stats);
        this.emit('stats-update', stats);
      } catch (error) {
        log.error('Error in hardware monitoring:', error);
      }
    }, this.MONITORING_INTERVAL);
  }

  private async performSystemCheck(): Promise<SystemCheckResult> {
    try {
      const [cpu, memory, gpu] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.graphics(),
      ]);

      const systemRequirements = {
        minCPUCores: 4,
        minRAM: 8 * 1024 * 1024 * 1024, // 8GB
        minGPUMemory: 2 * 1024, // 2GB
      };

      const checkResults = {
        cpu: cpu.cores >= systemRequirements.minCPUCores,
        memory: memory.total >= systemRequirements.minRAM,
        gpu: gpu.controllers.some(c => c.vram >= systemRequirements.minGPUMemory),
      };

      return {
        passed: Object.values(checkResults).every(result => result),
        details: checkResults,
      };
    } catch (error) {
      log.error('System check failed:', error);
      throw error;
    }
  }

  private checkThresholds(stats: HardwareStats) {
    // CPU Usage Check
    if (stats.cpu.usage > this.ALERT_THRESHOLDS.cpu) {
      this.emit('alert', {
        type: 'cpu',
        message: `High CPU usage: ${stats.cpu.usage.toFixed(2)}%`,
        severity: 'warning',
      });
    }

    // Memory Usage Check
    if (stats.memory.usage > this.ALERT_THRESHOLDS.memory) {
      this.emit('alert', {
        type: 'memory',
        message: `High memory usage: ${stats.memory.usage.toFixed(2)}%`,
        severity: 'warning',
      });
    }

    // GPU Usage Check
    stats.gpu.controllers.forEach((controller, index) => {
      if (controller.usage > this.ALERT_THRESHOLDS.gpu) {
        this.emit('alert', {
          type: 'gpu',
          message: `High GPU ${index} usage: ${controller.usage.toFixed(2)}%`,
          severity: 'warning',
        });
      }
    });

    // Temperature Check
    if (stats.temperature.main > this.ALERT_THRESHOLDS.temperature) {
      this.emit('alert', {
        type: 'temperature',
        message: `High CPU temperature: ${stats.temperature.main}°C`,
        severity: 'critical',
      });
    }

    // Storage Check
    stats.disk.partitions.forEach(partition => {
      if (partition.use > this.ALERT_THRESHOLDS.storage) {
        this.emit('alert', {
          type: 'storage',
          message: `Low storage space on ${partition.mount}: ${partition.use}% used`,
          severity: 'warning',
        });
      }
    });
  }

  public cleanup() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.removeAllListeners();
  }
}

// Types
interface CPUStats {
  usage: number;
  temperature: number[];
  cores: Array<{
    model: string;
    speed: number;
    times: {
      user: number;
      nice: number;
      sys: number;
      idle: number;
      irq: number;
    };
  }>;
  info: {
    manufacturer: string;
    brand: string;
    speed: number;
    cores: number;
    physicalCores: number;
  };
}

interface MemoryStats {
  total: number;
  used: number;
  free: number;
  swap: {
    total: number;
    used: number;
    free: number;
  };
  usage: number;
}

interface GPUStats {
  controllers: Array<{
    model: string;
    vendor: string;
    vram: number;
    temperature: number;
    usage: number;
    memoryUsage: number;
    fanSpeed: number;
  }>;
}

interface TemperatureStats {
  main: number;
  cores: number[];
  max: number;
}

interface DiskStats {
  drives: Array<{
    device: string;
    type: string;
    name: string;
    size: number;
    temperature: number;
  }>;
  partitions: Array<{
    fs: string;
    type: string;
    size: number;
    used: number;
    use: number;
    mount: string;
  }>;
}

interface NetworkStats {
  interfaces: Array<{
    iface: string;
    ip4: string;
    ip6: string;
    mac: string;
    speed: number;
    type: string;
  }>;
  stats: Array<{
    interface: string;
    rxBytes: number;
    txBytes: number;
    rxErrors: number;
    txErrors: number;
  }>;
}

interface HardwareStats {
  cpu: CPUStats;
  memory: MemoryStats;
  gpu: GPUStats;
  temperature: TemperatureStats;
  disk: DiskStats;
  network: NetworkStats;
  timestamp: number;
}

interface SystemCheckResult {
  passed: boolean;
  details: {
    cpu: boolean;
    memory: boolean;
    gpu: boolean;
  };
}
