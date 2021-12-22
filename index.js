const fs = require("fs");
const axios = require("axios");
const FormData = require('form-data');

const jsdom = require("jsdom");
const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.sendTo(console, {omitJSDOMErrors: true});
const {JSDOM} = jsdom;

async function downloadData(path) {
  // Request page to get form data
  const pageRequest = await axios.get("https://www.nycenet.edu/PublicApps/Attendance.aspx");
  const pageDOM = new JSDOM(pageRequest.data, {virtualConsole});
  const formInputs = Array.from(pageDOM.window.document.querySelectorAll("#form1 input"));

  // Compile form data
  const form = new FormData();
  form.append("__EVENTTARGET", "ctl00$ContentPlaceHolder1$btnExport");
  formInputs.forEach(input => {
    form.append(input.id, input.value);
  });

  // Request table using form data
  const tableRequest = await axios.post("https://www.nycenet.edu/PublicApps/Attendance.aspx", form, { 
    headers: form.getHeaders() 
  });
  const tableDom = new JSDOM(tableRequest.data, {virtualConsole});

  // Parse header and rows
  const tableRows = Array.from(tableDom.window.document.querySelectorAll("table tr"));
  const header = tableRows[0];
  const rows = tableRows.slice(1);

  // Convert rows to objects
  const colNames = Array.from(header.querySelectorAll("th")).map(th => th.innerHTML);
  const rowData = rows.map(row => {
    const rowEntries = Array.from(row.querySelectorAll("td")).map((td, i) => {
      return [colNames[i], td.innerHTML];
    });

    return Object.fromEntries(rowEntries);
  });

  // Write data as JSON
  console.log(`Saving data to ${path}`);
  fs.writeFileSync(path, JSON.stringify(rowData, null, 2));
};

async function main() {
  try {
    await downloadData("attendance-data.json");
  } catch (e) {
    console.error(e);
  }
}

main();