import * as pdfjsLib from 'pdfjs-dist';
const pdfData = Buffer.from("JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLY2UgCwAxxIEJwplbmRzdHJlYW0KZW5kb2JqCgozIDAgb2JqCjI0CmVuZG9iagoKMSAwIG9iago8PC9QYWdlcyA0IDAgUiAvVHlwZSAvQ2F0YWxvZz4+CmVuZG9iagoKNSAwIG9iago8PC9BcnRCb3hbMCAwIDM3OCA1MjVdL0JsZWVkQm94WzAgMCAzNzggNTI1XS9Db250ZW50cyAyIDAgUiAvQ3JvcEJveFswIDAgMzc4IDUyNV0vTWVkaWFCb3hbMCAwIDM3OCA1MjVdL1BhcmVudCA0IDAgUiAvUmVzb3VyY2VzPDwvRm9udDw8L0YxIDYgMCBSPj4+Pi9UeXBlIC9QYWdlPj4KZW5kb2JqCgo0IDAgb2JqCjw8L0NvdW50IDEgL0tpZHNbNSAwIFJdL1R5cGUgL1BhZ2VzPj4KZW5kb2JqCgo2IDAgb2JqCjw8L0Jhc2VGb250IC9IZWx2ZXRpY2EvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvU3VidHlwZSAvVHlwZTEvVHlwZSAvRm9udD4+CmVuZG9iagoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA5NyAwMDAwMCBuIAowMDAwMDAwMjcyIDAwMDAwIG4gCjAwMDAwMDAxNjQgMDAwMDAgbiAKMDAwMDAwMDMzMSAwMDAwMCBuIAp0cmFpbGVyCjw8L1Jvb3QgMSAwIFIgL1NpemUgNz4+CnN0YXJ0eHJlZgo0MjMKJSVFT0YK", "base64");
const ab = new ArrayBuffer(pdfData.length);
const view = new Uint8Array(ab);
for (let i = 0; i < pdfData.length; ++i) {
    view[i] = pdfData[i];
}
console.log("Testing with ArrayBuffer:");
try {
  pdfjsLib.getDocument({ data: ab }).promise.then(()=>console.log("AB Success")).catch(e=>console.log("AB Error:", e.message));
} catch(e) { console.log("AB Sync Error:", e.message); }

console.log("Testing with Uint8Array:");
try {
  pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise.then(()=>console.log("U8 Success")).catch(e=>console.log("U8 Error:", e.message));
} catch(e) { console.log("U8 Sync Error:", e.message); }
