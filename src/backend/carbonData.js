const https = require("https");

class CarbonDataService {
  constructor() {
    this.apiKey = process.env.ELECTRICITYMAPS_API_KEY || null;

    // Map internal regions to Electricity Maps zones
    this.zoneMapping = {
      "us-east": "US-MIDA",
      "us-west": "US-CAL",
      "eu-central": "DE",
    };
  }

  getHour(hourOfDay = null) {
    if (hourOfDay !== null && hourOfDay !== undefined) {
      return hourOfDay;
    }
    return new Date().getHours();
  }

  _getMockIntensity(region, hour) {
    switch (region) {
      case "us-west":
        // Solar-rich: drops mid-day (lowest at hour 12)
        return Math.round(225 + 175 * Math.cos(((hour - 12) * Math.PI) / 12));
      case "eu-central":
        // Wind-rich: drops at night (lowest at hour 0)
        return Math.round(200 - 100 * Math.cos(((hour - 12) * Math.PI) / 12));
      case "us-east":
        // Fossil-heavy: peaks in evening (highest around hour 21)
        return Math.round(500 + 100 * Math.sin(((hour - 15) * Math.PI) / 12));
      default:
        return 300;
    }
  }

  async _getLiveIntensity(zone) {
    return new Promise((resolve, reject) => {
      const url = `https://api.electricitymap.org/v3/carbon-intensity/latest?zone=${zone}`;
      const options = {
        headers: {
          "auth-token": this.apiKey,
        },
      };

      const req = https.get(url, options, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(body);
              resolve(data.carbonIntensity);
            } catch (e) {
              reject(new Error("Failed to parse JSON response"));
            }
          } else {
            reject(new Error(`API responded with status code ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on("error", (e) => {
        reject(e);
      });

      req.setTimeout(2000, () => {
        req.destroy();
        reject(new Error("Request timed out"));
      });
    });
  }

  async getCarbonIntensity(region, hourOfDay = null) {
    const hour = this.getHour(hourOfDay);

    if (this.apiKey) {
      const zone = this.zoneMapping[region];
      if (zone) {
        try {
          const intensity = await this._getLiveIntensity(zone);
          return intensity;
        } catch (err) {
          // Silent warning and fallback to mock
          // console.warn(`Electricity Maps query failed for region ${region} (zone ${zone}): ${err.message}. Falling back to mock data.`);
        }
      }
    }

    return this._getMockIntensity(region, hour);
  }
}

module.exports = CarbonDataService;
