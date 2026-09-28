const $ = (id) => document.getElementById(id);
const API_KEY = "E6NGpjUWfi1LrUqqf8Gj";
const BASE = "https://api.maptiler.com/geocoding/";

const typeOf = (f) => (f.place_type && f.place_type[0]) || (f.id || "").split(".")[0];
const nameOf = (f) => f.text || f.place_name || "";

// Semua tingkat wilayah: fitur itu sendiri + context (induk wilayahnya)

