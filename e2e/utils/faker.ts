import { randomUUID } from 'crypto';

/**
 * Test data generation utilities
 * Provides consistent, valid test data across fixtures
 */

export const faker = {
  /**
   * Generate valid UUID v4
   */
  uuid: (): string => randomUUID(),

  /**
   * Generate test email
   */
  email: (prefix: string = 'test'): string => {
    return `${prefix}.${Date.now()}@test.com`;
  },

  /**
   * Generate person name
   */
  person: {
    firstName: (): string => {
      const names = ['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
      return names[Math.floor(Math.random() * names.length)];
    },
    lastName: (): string => {
      const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
      return names[Math.floor(Math.random() * names.length)];
    },
  },

  /**
   * Generate company name
   */
  company: {
    name: (): string => {
      const prefixes = ['Acme', 'Global', 'Premier', 'Stellar', 'Quantum', 'Apex'];
      const suffixes = ['Corp', 'Inc', 'LLC', 'Solutions', 'Services', 'Group'];
      return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    },
  },

  /**
   * Generate phone number
   */
  phone: (): string => {
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const prefix = Math.floor(Math.random() * 900) + 100;
    const lineNumber = Math.floor(Math.random() * 9000) + 1000;
    return `${areaCode}-${prefix}-${lineNumber}`;
  },

  /**
   * Generate address
   */
  address: {
    street: (): string => {
      const numbers = Math.floor(Math.random() * 9000) + 1000;
      const streets = ['Main St', 'Oak Ave', 'Pine St', 'Maple Dr', 'Cedar Ln', 'Elm Way'];
      return `${numbers} ${streets[Math.floor(Math.random() * streets.length)]}`;
    },
    city: (): string => {
      const cities = ['Springfield', 'Riverside', 'Greenville', 'Madison', 'Franklin', 'Clinton'];
      return cities[Math.floor(Math.random() * cities.length)];
    },
    state: (): string => {
      const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA'];
      return states[Math.floor(Math.random() * states.length)];
    },
    zipCode: (): string => {
      return String(Math.floor(Math.random() * 90000) + 10000);
    },
  },

  /**
   * Generate strong password
   */
  password: (prefix: string = 'Test'): string => {
    return `${prefix}${Date.now()}!`;
  },
};
