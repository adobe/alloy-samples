import { z } from "zod";

export const OfficeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  location: z.string().min(2).max(100),
  description: z.string().min(2).max(1000),
  amenities: z.array(z.string().min(2).max(100)),
  phone: z.string().min(2).max(20),
});
/** @typedef {z.infer<typeof OfficeSchema>} Office */

/** @type {Record<Office["id"], Office>} */
export const officeData = Object.freeze({
  sf: {
    id: "sf",
    name: "San Francisco",
    location: "Market Street, SF",
    description: "Our headquarters office with amazing views of the Bay",
    amenities: ["Gym", "Cafe", "Parking", "Bike Storage"],
    phone: "+1 (415) 555-0100",
  },
  nyc: {
    id: "nyc",
    name: "New York",
    location: "Times Square, NYC",
    description:
      "East coast hub with great amenities and public transit access",
    amenities: ["Cafe", "Gym", "Conference Rooms", "Rooftop Deck"],
    phone: "+1 (212) 555-0200",
  },
  seattle: {
    id: "seattle",
    name: "Seattle",
    location: "Downtown Seattle",
    description:
      "Pacific Northwest office near the waterfront with mountain views",
    amenities: ["Cafe", "Gym", "Bike Storage", "Pet Friendly"],
    phone: "+1 (206) 555-0300",
  },
});
export const OfficeIdSchema = z.enum(Object.keys(officeData));
