const mapDelta = {
  lat: 0.035,
  lng: 0.055
};

export function getOpenStreetMapSearchUrl(region: string): string {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(region)}`;
}

export function getOpenStreetMapMarkerUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=12/${lat}/${lng}`;
}

export function getOpenStreetMapEmbedUrl(lat: number, lng: number): string {
  const bbox = [
    lng - mapDelta.lng,
    lat - mapDelta.lat,
    lng + mapDelta.lng,
    lat + mapDelta.lat
  ].join(",");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
}
