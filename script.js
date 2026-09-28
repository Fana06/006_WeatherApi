const $ = (id) => document.getElementById(id);
const API_KEY = "E6NGpjUWfi1LrUqqf8Gj";
const BASE = "https://api.maptiler.com/geocoding/";

const typeOf = (f) => (f.place_type && f.place_type[0]) || (f.id || "").split(".")[0];
const nameOf = (f) => f.text || f.place_name || "";

// Semua tingkat wilayah: fitur itu sendiri + context (induk wilayahnya)
function allLevels(feature) {
  const list = [{ type: typeOf(feature), name: nameOf(feature) }];
  (feature.context || []).forEach((c) => list.push({ type: typeOf(c), name: nameOf(c) }));
  return list.filter((l) => l.name);
}

function firstOf(levels, types) {
  for (const t of types) {
    const hit = levels.find((l) => l.type === t);
    if (hit) return hit.name;
  }
  return null;
}

function parse(feature) {
  const levels = allLevels(feature);
  const coords = feature.center || (feature.geometry && feature.geometry.coordinates);
  return {
    negara: firstOf(levels, ["country"]),
    provinsi: firstOf(levels, ["region"]),
    kabupaten: firstOf(levels, ["county", "subregion", "municipality", "joint_municipality"]),
    kecamatan: firstOf(levels, ["municipal_district", "joint_submunicipality", "locality"]),
    lon: coords[0],
    lat: coords[1],
    levels,
  };
}

const NA = "Tidak tersedia";
let current = null;

function show(feature, raw) {
  const d = parse(feature);
  current = d;
  $("negara").textContent = d.negara || NA;
  $("provinsi").textContent = d.provinsi || NA;
  $("kabupaten").textContent = d.kabupaten || NA;
  $("kecamatan").textContent = d.kecamatan || NA;
  $("lon").textContent = d.lon.toFixed(6);
  $("lat").textContent = d.lat.toFixed(6);
  $("needle").style.transform = `rotate(${180 + (d.lon + 180)}deg)`;
  $("gmaps").href = `https://www.google.com/maps?q=${d.lat},${d.lon}`;

  const img = $("mapImg");
  img.hidden = false;
  img.onerror = () => { img.hidden = true; };
  img.src = `https://api.maptiler.com/maps/streets-v2/static/${d.lon},${d.lat},12/800x400.png?key=${API_KEY}&markers=${d.lon},${d.lat}`;

  $("raw").textContent = JSON.stringify(raw, null, 2);
  const ul = $("levels");
  ul.innerHTML = "";
  d.levels.forEach((l) => {
    const li = document.createElement("li");
    li.textContent = `${l.type}: ${l.name}`;
    ul.appendChild(li);
  });
  $("result").hidden = false;
}

function setStatus(msg, isError) {
  const s = $("status");
  s.textContent = msg;
  s.classList.toggle("err", !!isError);
}

function renderCandidates(features, raw) {
  const box = $("candidates");
  box.innerHTML = "";
  $("candidatesWrap").hidden = features.length < 2;
  if (features.length < 2) return;
  features.forEach((f, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = f.place_name || nameOf(f);
    if (i === 0) b.className = "on";
    b.onclick = () => {
      box.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      show(f, { ...raw, features: [f] });
    };
    box.appendChild(b);
  });
}

async function search(q) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  $("goBtn").disabled = true;
  setStatus("Sedang mencari lokasi...");
  try {
    const url = `${BASE}${encodeURIComponent(q)}.json?key=${API_KEY}&language=id&limit=5`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (res.status === 401 || res.status === 403) throw new Error("API key ditolak. Buka dashboard MapTiler, lalu periksa pengaturan Allowed HTTP origins pada key ini.");
    if (res.status === 429) throw new Error("Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.");
    if (!res.ok) throw new Error(`Server MapTiler membalas kode ${res.status}. Coba lagi nanti.`);
    const data = await res.json();
    if (!data.features || !data.features.length) {
      $("result").hidden = true;
      $("candidatesWrap").hidden = true;
      setStatus(`Lokasi "${q}" tidak ditemukan. Coba tulis nama yang lebih lengkap, misalnya nama kota atau kabupatennya.`, true);
      return;
    }
    setStatus("");
    renderCandidates(data.features, data);
    show(data.features[0], { ...data, features: [data.features[0]] });
  } catch (err) {
    let msg = err.message;
    if (err.name === "AbortError") msg = "Permintaan terlalu lama. Periksa internet Anda lalu coba lagi.";
    else if (err instanceof TypeError) msg = "Tidak bisa terhubung ke MapTiler. Periksa koneksi internet Anda.";
    setStatus(msg || "Terjadi kesalahan. Coba lagi.", true);
  } finally {
    clearTimeout(timer);
    $("goBtn").disabled = false;
  }
}

$("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("place").value.replace(/[\/\\?#]/g, " ").replace(/\s+/g, " ").trim();
  if (!q) {
    setStatus("Ketik nama tempat dulu, misalnya: Kasihan, Bantul.", true);
    $("place").focus();
    return;
  }
  search(q);
});

document.querySelectorAll(".chip").forEach((c) =>
  c.addEventListener("click", () => {
    $("place").value = c.dataset.q;
    $("searchForm").requestSubmit();
  })
);

$("copyBtn").addEventListener("click", async () => {
  if (!current) return;
  const text = `${current.lat}, ${current.lon}`;
  try {
    await navigator.clipboard.writeText(text);
    setStatus(`Koordinat tersalin: ${text}`);
  } catch {
    setStatus(`Salin manual: ${text}`);
  }
});
