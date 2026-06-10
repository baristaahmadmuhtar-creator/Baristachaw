const assert = require('assert');

const BROKEN_USER_COPY = /\$(?:\d+|\{)|\b(?:undefined|null|NaN|\[object Object\]|ActionAction|Action\s+Action|Pressgentle|Stophiss)\b|pour air|stir\s+\d+(?:-\d+)?\s+times\s+saja|Tekan [^.!?]*seconds|Seduh [^.!?]*brew/i;

const text = "Biarkan seduhan singkat nan intens ini selesai meniris. Total waktu kontak harus di bawah 3 menit.";
const match = text.match(BROKEN_USER_COPY);
console.log("Broken copy match:", match);

const chemexBloom = "Lakukan blooming dengan sabar. Kertas Chemex secara alami menahan aliran, sehingga saturasi mendalam dan total jauh lebih penting daripada kecepatan tuang. Lakukan untuk mempertahankan keseimbangan struktural absolut; dorong ekstraksi untuk kepadatan sangrai terang.";
console.log("Chemex bloom length:", chemexBloom.length);

const coldBrewWrongMethod = "Add a small amount of hot bloom water first to rapidly degas, then immediately shock it with the remaining icy water. Tambahkan sedikit air panas (blooming) lebih dulu untuk mendegas cepat, lalu kejutkan seketika dengan sisa air sedingin es.";
const coldBrewLeak = /\b(hot bloom|bloom panas|kettle|ceret|final pour|tuang akhir|drawdown|air turun|hot pour|tuang panas)\b/i;
console.log("Cold brew leak match:", coldBrewWrongMethod.match(coldBrewLeak));
