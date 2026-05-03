const formData = {
  surety: {
    name: "Alex",
    phone: "123",
    email: "alex@abc.com",
    documentFile: "file"
  }
};

const payload = { ...formData };
let suretyDocumentToUpload = null;
if (payload.surety) {
  suretyDocumentToUpload = payload.surety.documentFile;
  delete payload.surety.documentFile;
}

console.log(payload.surety);
