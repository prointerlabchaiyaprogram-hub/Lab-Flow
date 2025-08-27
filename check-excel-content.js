const ExcelJS = require('exceljs');

async function checkExcelContent() {
  try {
    console.log('🔍 Checking Excel file content...\n');
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('../test-report5.xlsx');
    
    const worksheet = workbook.getWorksheet(1);
    
    console.log('📊 Excel file analysis:');
    console.log(`   Worksheet name: ${worksheet.name}`);
    console.log(`   Row count: ${worksheet.rowCount}`);
    console.log(`   Column count: ${worksheet.columnCount}\n`);
    
    // Check headers
    const headerRow = worksheet.getRow(1);
    console.log('📋 Headers:');
    headerRow.eachCell((cell, colNumber) => {
      console.log(`   Column ${colNumber}: "${cell.value}"`);
    });
    
    // Check data rows
    console.log('\n📄 Data rows:');
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      console.log(`\n   Row ${rowNumber}:`);
      
      row.eachCell((cell, colNumber) => {
        const header = worksheet.getCell(1, colNumber).value;
        console.log(`     ${header}: "${cell.value}"`);
      });
    }
    
    // Specifically check birthdate and gender columns
    console.log('\n🎯 Checking birthdate and gender columns:');
    const birthdateCol = findColumnByHeader(worksheet, 'วันเกิด');
    const genderCol = findColumnByHeader(worksheet, 'เพศ');
    
    if (birthdateCol) {
      console.log(`   Birthdate column found at: ${birthdateCol}`);
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const cell = worksheet.getCell(rowNumber, birthdateCol);
        console.log(`     Row ${rowNumber} birthdate: "${cell.value}"`);
      }
    } else {
      console.log('   ❌ Birthdate column not found');
    }
    
    if (genderCol) {
      console.log(`   Gender column found at: ${genderCol}`);
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const cell = worksheet.getCell(rowNumber, genderCol);
        console.log(`     Row ${rowNumber} gender: "${cell.value}"`);
      }
    } else {
      console.log('   ❌ Gender column not found');
    }
    
  } catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
  }
}

function findColumnByHeader(worksheet, headerName) {
  const headerRow = worksheet.getRow(1);
  let columnNumber = null;
  
  headerRow.eachCell((cell, colNumber) => {
    if (cell.value === headerName) {
      columnNumber = colNumber;
    }
  });
  
  return columnNumber;
}

checkExcelContent();
