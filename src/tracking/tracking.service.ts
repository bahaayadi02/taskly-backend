import { Injectable, BadRequestException } from '@nestjs/common';

export interface WorkerLocation {
  workerId: string;
  bookingId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

@Injectable()
export class TrackingService {
  // In-memory storage for active tracking sessions
  // In production, use Redis for scalability
  private activeTracking: Map<string, WorkerLocation> = new Map();

  async startTracking(workerId: string, bookingId: string): Promise<void> {
    console.log(`📍 [Tracking] Worker ${workerId} started tracking for booking ${bookingId}`);
    
    // Initialize tracking entry
    this.activeTracking.set(bookingId, {
      workerId,
      bookingId,
      latitude: 0,
      longitude: 0,
      timestamp: new Date(),
    });
  }

  async updateLocation(
    workerId: string,
    bookingId: string,
    location: { latitude: number; longitude: number; heading?: number; speed?: number },
  ): Promise<void> {
    const tracking = this.activeTracking.get(bookingId);
    
    if (!tracking) {
      // Auto-start tracking if not started
      await this.startTracking(workerId, bookingId);
    }

    this.activeTracking.set(bookingId, {
      workerId,
      bookingId,
      latitude: location.latitude,
      longitude: location.longitude,
      heading: location.heading,
      speed: location.speed,
      timestamp: new Date(),
    });

    console.log(`📍 [Tracking] Location updated for booking ${bookingId}: ${location.latitude}, ${location.longitude}`);
  }

  async stopTracking(workerId: string, bookingId: string): Promise<void> {
    this.activeTracking.delete(bookingId);
    console.log(`🛑 [Tracking] Worker ${workerId} stopped tracking for booking ${bookingId}`);
  }

  async getLocation(bookingId: string): Promise<WorkerLocation | null> {
    const location = this.activeTracking.get(bookingId);
    
    if (!location) {
      return null;
    }

    // Check if location is stale (more than 2 minutes old)
    const now = new Date();
    const locationAge = now.getTime() - location.timestamp.getTime();
    const maxAge = 2 * 60 * 1000; // 2 minutes

    if (locationAge > maxAge) {
      return {
        ...location,
        // Mark as stale
      };
    }

    return location;
  }

  isTracking(bookingId: string): boolean {
    return this.activeTracking.has(bookingId);
  }

  // ============================================
  // SIMULATION METHODS (for testing)
  // ============================================
  
  private simulations: Map<string, NodeJS.Timeout> = new Map();

  async startSimulation(
    bookingId: string,
    workerLat: number,
    workerLng: number,
    destLat: number,
    destLng: number,
  ): Promise<void> {
    // Stop any existing simulation
    await this.stopSimulation(bookingId);

    console.log(`🎮 [Simulation] Starting for booking ${bookingId}`);
    console.log(`   Worker: ${workerLat}, ${workerLng}`);
    console.log(`   Destination: ${destLat}, ${destLng}`);

    let currentLat = workerLat;
    let currentLng = workerLng;
    let step = 0;
    const totalSteps = 60; // 60 steps = ~2 minutes to arrive

    // Calculate step size
    const latStep = (destLat - workerLat) / totalSteps;
    const lngStep = (destLng - workerLng) / totalSteps;

    // Calculate heading (direction)
    const heading = this.calculateHeading(workerLat, workerLng, destLat, destLng);

    // Update location every 2 seconds
    const interval = setInterval(async () => {
      step++;
      
      // Add some randomness to simulate real movement
      const randomLat = (Math.random() - 0.5) * 0.0002;
      const randomLng = (Math.random() - 0.5) * 0.0002;
      
      currentLat += latStep + randomLat;
      currentLng += lngStep + randomLng;

      // Update location
      this.activeTracking.set(bookingId, {
        workerId: 'simulation',
        bookingId,
        latitude: currentLat,
        longitude: currentLng,
        heading: heading + (Math.random() - 0.5) * 10, // slight heading variation
        speed: 25 + Math.random() * 15, // 25-40 km/h
        timestamp: new Date(),
      });

      console.log(`🎮 [Simulation] Step ${step}/${totalSteps}: ${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`);

      // Stop when arrived
      if (step >= totalSteps) {
        console.log(`🎮 [Simulation] Worker arrived at destination!`);
        clearInterval(interval);
        this.simulations.delete(bookingId);
      }
    }, 2000);

    this.simulations.set(bookingId, interval);

    // Set initial position immediately
    this.activeTracking.set(bookingId, {
      workerId: 'simulation',
      bookingId,
      latitude: currentLat,
      longitude: currentLng,
      heading,
      speed: 30,
      timestamp: new Date(),
    });
  }

  async stopSimulation(bookingId: string): Promise<void> {
    const interval = this.simulations.get(bookingId);
    if (interval) {
      clearInterval(interval);
      this.simulations.delete(bookingId);
      this.activeTracking.delete(bookingId);
      console.log(`🎮 [Simulation] Stopped for booking ${bookingId}`);
    }
  }

  private calculateHeading(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const x = Math.sin(dLng) * Math.cos(lat2Rad);
    const y = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    let heading = Math.atan2(x, y) * 180 / Math.PI;
    heading = (heading + 360) % 360;

    return heading;
  }
}
