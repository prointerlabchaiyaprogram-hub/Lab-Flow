const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const Visit = require('../models/Visit');
const Patient = require('../models/Patient');
const Order = require('../models/Order');

// Generate Registration Report Excel
router.get('/registration-excel', async (req, res) => {
  try {
    const { fromDate, toDate, organization } = req.query;
    
    console.log('Registration report parameters:', { fromDate, toDate, organization });
    
    // Build date filter - use visitDate instead of createdAt for more accurate filtering
    let filter = {};
    if (fromDate && toDate) {
      filter.visitDate = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate + 'T23:59:59.999Z') // Include the entire end date
      };
    }
    
    // Add organization filter if specified
    if (organization) {
      filter.organization = organization;
    }
    
    console.log('Final filter for registration report:', filter);
    
    // Fetch visits with populated patient data and filtering
    const visits = await Visit.find(filter)
      .populate('patient')
      .sort({ createdAt: -1 });

    console.log(`\n🔍 REPORT GENERATION STARTED`);
    console.log(`Found ${visits.length} visits`);
    
    // Debug: Check if patient data is properly populated
    visits.forEach((visit, index) => {
      console.log(`\nVisit ${index + 1} Debug:`);
      console.log(`  - Reference: ${visit.referenceNumber}`);
      console.log(`  - Patient populated: ${!!visit.patient}`);
      if (visit.patient) {
        console.log(`  - Patient ID: ${visit.patient._id}`);
        console.log(`  - Patient name: ${visit.patient.firstName} ${visit.patient.lastName}`);
        console.log(`  - Patient birthDate: ${visit.patient.birthDate}`);
        console.log(`  - Patient gender: ${visit.patient.gender}`);
      }
    });

    // Create new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ข้อมูลรายชื่อลงทะเบียน');

    // Set column headers and widths
    worksheet.columns = [
      { header: 'เลขอ้างอิง', key: 'referenceNumber', width: 15 },
      { header: 'LN', key: 'ln', width: 12 },
      { header: 'เลขบัตรประชาชน', key: 'idCard', width: 18 },
      { header: 'คำนำหน้า', key: 'prefix', width: 10 },
      { header: 'ชื่อ', key: 'firstName', width: 15 },
      { header: 'นามสกุล', key: 'lastName', width: 15 },
      { header: 'อายุ', key: 'age', width: 8 },
      { header: 'วันเกิด', key: 'birthdate', width: 12 },
      { header: 'เพศ', key: 'gender', width: 8 },
      { header: 'เบอร์โทร', key: 'phone', width: 12 },
      { header: 'น้ำหนัก', key: 'weight', width: 10 },
      { header: 'ส่วนสูง', key: 'height', width: 10 },
      { header: 'ความดันโลหิต', key: 'bloodPressure', width: 15 },
      { header: 'ชีพจร', key: 'pulse', width: 10 },
      { header: 'ที่อยู่', key: 'address', width: 30 },
      { header: 'หน่วยงาน', key: 'organization', width: 20 },
      { header: 'หน่วยงานอื่นๆ', key: 'otherOrganization', width: 20 },
      { header: 'สิทธิ', key: 'rights', width: 15 },
      { header: 'วันที่ลงทะเบียน', key: 'registrationDate', width: 18 },
      { header: 'วันที่มาตรวจ', key: 'visitDate', width: 15 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // Add borders to header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
    visits.forEach((visit, index) => {
      const patient = visit.patient;
      
      if (!patient) {
        console.log(`Visit ${visit._id} has no patient data`);
        return;
      }

      // Debug logging - force console output
      console.log(`\n=== Processing visit ${index + 1}: ${visit.referenceNumber} ===`);
      console.log(`Raw patient data:`, {
        birthDate: patient.birthDate,
        gender: patient.gender,
        firstName: patient.firstName,
        lastName: patient.lastName
      });

      // Format birthDate properly
      let formattedBirthDate = '';
      if (patient.birthDate) {
        try {
          formattedBirthDate = new Date(patient.birthDate).toLocaleDateString('th-TH');
          console.log(`✅ Formatted birthDate: "${formattedBirthDate}"`);
        } catch (error) {
          console.error(`❌ Error formatting birthDate: ${error.message}`);
          formattedBirthDate = patient.birthDate.toString();
        }
      } else {
        console.log(`❌ No birthDate found for patient`);
      }

      // Check gender
      const genderValue = patient.gender || '';
      console.log(`✅ Gender value: "${genderValue}"`);
      
      console.log(`Final values - birthdate: "${formattedBirthDate}", gender: "${genderValue}"`);

      const rowData = {
        referenceNumber: visit.referenceNumber || '',
        ln: patient.ln || '',
        idCard: patient.idCard || '',
        prefix: patient.prefix || '',
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        age: patient.age || '',
        birthdate: formattedBirthDate,
        gender: genderValue,
        phone: patient.phone || '',
        weight: visit.weight || '',
        height: visit.height || '',
        bloodPressure: visit.bloodPressure || '',
        pulse: visit.pulse || '',
        address: patient.address || '',
        organization: visit.organization || '',
        otherOrganization: visit.otherOrganization || '',
        rights: visit.rights || '',
        registrationDate: patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('th-TH') : '',
        visitDate: visit.visitDate ? new Date(visit.visitDate).toLocaleDateString('th-TH') : ''
      };

      console.log(`Row data - birthdate: "${rowData.birthdate}", gender: "${rowData.gender}"`);

      const row = worksheet.addRow(rowData);

      // Add borders to data rows
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }
    });

    // Auto-fit columns (approximate)
    worksheet.columns.forEach(column => {
      if (column.width < 10) column.width = 10;
      if (column.width > 40) column.width = 40;
    });

    // Set response headers
    const filename = `ข้อมูลรายชื่อลงทะเบียน_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // Write to response
    await workbook.xlsx.write(res);
    console.log('Excel file generated successfully');

  } catch (error) {
    console.error('Error generating Excel report:', error);
    res.status(500).json({ 
      error: 'Failed to generate Excel report',
      details: error.message 
    });
  }
});

// Generate Sales Report Excel
router.get('/sales-excel', async (req, res) => {
  try {
    const { fromDate, toDate, organization } = req.query;
    
    console.log('Sales report parameters:', { fromDate, toDate, organization });
    
    // Build date filter using createdAt for orders
    let dateFilter = {};
    if (fromDate && toDate) {
      dateFilter.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate + 'T23:59:59.999Z')
      };
    }
    
    // Build organization filter for visits if specified
    let visitFilter = {};
    if (organization) {
      visitFilter.organization = organization;
    }
    
    console.log('Sales report filters:', { dateFilter, visitFilter });
    
    // Fetch orders with populated visit and patient data
    let orders;
    if (organization) {
      // If organization filter is specified, first find matching visits
      const matchingVisits = await Visit.find(visitFilter).select('_id');
      const visitIds = matchingVisits.map(v => v._id);
      
      // Then find orders for those visits
      const combinedFilter = { ...dateFilter, visit: { $in: visitIds } };
      orders = await Order.find(combinedFilter)
        .populate({
          path: 'visit',
          populate: {
            path: 'patient'
          }
        })
        .sort({ createdAt: -1 });
    } else {
      // No organization filter, use original query
      orders = await Order.find(dateFilter)
        .populate({
          path: 'visit',
          populate: {
            path: 'patient'
          }
        })
        .sort({ createdAt: -1 });
    }

    console.log(`Found ${orders.length} orders for sales report`);
    
    // Debug: Check if visits have rights data
    orders.forEach((order, index) => {
      if (index < 3) { // Log first 3 orders for debugging
        console.log(`Order ${index + 1}:`, {
          visitRights: order.visit?.rights,
          paymentMethod: order.paymentMethod,
          visitId: order.visit?._id
        });
      }
    });

    // Create new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('รายงานการขาย');

    // Get all unique items to create dynamic columns
    const allItems = new Set();
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (item.name) {
            allItems.add(item.name);
          }
        });
      }
    });
    
    const itemsArray = Array.from(allItems);
    console.log('Unique items found:', itemsArray);

    // Define base columns
    const baseColumns = [
      { header: 'เลขอ้างอิง', key: 'referenceNumber', width: 15 },
      { header: 'LN', key: 'ln', width: 10 },
      { header: 'คำนำหน้า', key: 'prefix', width: 10 },
      { header: 'ชื่อ', key: 'firstName', width: 15 },
      { header: 'นามสกุล', key: 'lastName', width: 15 },
      { header: 'อายุ', key: 'age', width: 8 },
      { header: 'สิทธิ', key: 'rights', width: 15 },
      { header: 'วันที่', key: 'orderDate', width: 12 },
      { header: 'วิธีการชำระเงิน', key: 'paymentMethod', width: 15 }
    ];

    // Add item columns dynamically
    const itemColumns = itemsArray.map(itemName => ({
      header: itemName,
      key: `item_${itemName.replace(/\s+/g, '_')}`,
      width: 12
    }));

    // Add total amount column
    const totalColumn = { header: 'รวมเงิน', key: 'totalAmount', width: 12 };

    // Combine all columns
    const allColumns = [...baseColumns, ...itemColumns, totalColumn];
    worksheet.columns = allColumns;

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add data rows
    orders.forEach((order, index) => {
      const visit = order.visit;
      const patient = visit?.patient;
      
      // Create row data
      const rowData = {
        referenceNumber: visit?.referenceNumber || '',
        ln: patient?.ln || '',
        prefix: patient?.prefix || '',
        firstName: patient?.firstName || '',
        lastName: patient?.lastName || '',
        age: patient?.age || '',
        rights: visit?.rights || '',
        orderDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString('th-TH') : '',
        paymentMethod: order.paymentMethod === 'cash' ? 'เงินสด' : 
                      order.paymentMethod === 'transfer' ? 'โอนเงิน' : 
                      order.paymentMethod === 'rights' ? 'สิทธิ์' : order.paymentMethod || '',
        totalAmount: order.totalAmount || 0
      };

      // Add item prices to corresponding columns
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (item.name) {
            const columnKey = `item_${item.name.replace(/\s+/g, '_')}`;
            rowData[columnKey] = item.price || 0;
          }
        });
      }

      const row = worksheet.addRow(rowData);
      
      // Alternate row colors
      if (index % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' }
        };
      }
      
      // Center align specific columns
      row.getCell('age').alignment = { horizontal: 'center' };
      row.getCell('orderDate').alignment = { horizontal: 'center' };
      row.getCell('paymentMethod').alignment = { horizontal: 'center' };
      row.getCell('totalAmount').alignment = { horizontal: 'right' };
      
      // Right align all item price columns
      itemsArray.forEach(itemName => {
        const columnKey = `item_${itemName.replace(/\s+/g, '_')}`;
        row.getCell(columnKey).alignment = { horizontal: 'right' };
      });
    });

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Set response headers
    const filename = `รายงานการขาย_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // Write to response
    await workbook.xlsx.write(res);
    console.log('Sales Excel file generated successfully');

  } catch (error) {
    console.error('Error generating sales Excel report:', error);
    res.status(500).json({ 
      error: 'Failed to generate sales Excel report',
      details: error.message 
    });
  }
});

// Generate Laboratory Data Import Report Excel
router.get('/lab-import-excel', async (req, res) => {
  try {
    const { fromDate, toDate, organization } = req.query;
    
    console.log('Lab import report parameters:', { fromDate, toDate, organization });
    
    // Build date filter
    let filter = {};
    if (fromDate && toDate) {
      filter.visitDate = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate + 'T23:59:59.999Z')
      };
    }
    
    // Add organization filter if specified
    if (organization) {
      filter.organization = organization;
    }
    
    console.log('Final filter for lab import report:', filter);
    
    // Fetch visits with populated patient data and orders
    const visits = await Visit.find(filter)
      .populate('patient')
      .sort({ createdAt: -1 });

    // Fetch orders for each visit to get lab test information
    const orders = await Order.find({
      visit: { $in: visits.map(v => v._id) }
    }).populate({
      path: 'items.item',
      populate: {
        path: 'tests',
        model: 'LabTest'
      }
    });

    console.log(`Found ${visits.length} visits and ${orders.length} orders for lab import report`);
    
    // Create new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ข้อมูลนำเข้าห้องแลบ');

    // Define all lab test columns based on your specifications
    const labTestColumns = [
      'CBC', 'ABO', 'BUN', 'Creatinine', 'AST', 'ALT', 'ALP', 'eGFR', 'FBS', 'HDL', 'LDL', 
      'Triglyceride', 'Cholesterol', 'Uric acid', 'AFP', 'Anti HAV', 'Anti HCV', 'Anti HBs', 
      'Anti HIV', 'CA125', 'CA15-3', 'CA19-9', 'CEA', 'FT3', 'FT4', 'HBs Ag', 'PSA', 'TSH', 
      'Flu A/B', 'RSV', 'Covid-19', 'Dengue IgM', 'Dengue IgG', 'Dengue NS1', 'Leptospira', 
      'Methamphetamine', 'UPT', 'Albumin', 'Amylase', 'Calcium', 'Cholinesterase', 'CK-MB', 
      'CPK', 'Cystatin-C', 'Direct Bilirubin', 'GGT', 'Globulin', 'HbA1C', 'Homocysteine', 
      'hs-CRP', 'CRP', 'LDH', 'Magnesium', 'Phosphorus', 'Total Bilirubin', 'Total Protein', 
      'Microalbumin', 'Beta HCG', 'NSE', 'VDRL', 'Progesterone', 'Rheumatoid Factor', 'D-dimer', 
      'Hb typing', 'HPV DNA', 'FIT Test', 'UA', 'Rh', 'PT', 'PTT', 'INR', 'DTX', 'Stool Culture', 
      'Chest X-ray', 'Stool', 'FSH', 'Prolactin', 'Testosterone', 'Pharmacogenetics', 'Vitamin D'
    ];

    // Set column headers and widths
    const baseColumns = [
      { header: 'LN', key: 'ln', width: 12 },
      { header: 'HN', key: 'hn', width: 12 },
      { header: 'คำนำหน้า', key: 'prefix', width: 10 },
      { header: 'ชื่อ', key: 'firstName', width: 15 },
      { header: 'นามสกุล', key: 'lastName', width: 15 },
      { header: 'เพศ', key: 'gender', width: 8 },
      { header: 'อายุ', key: 'age', width: 8 },
      { header: 'ส่วนสูง', key: 'height', width: 10 },
      { header: 'สิทธิ์', key: 'rights', width: 15 }
    ];

    // Add lab test columns
    const testColumns = labTestColumns.map(test => ({
      header: test,
      key: `test_${test.replace(/\s+/g, '_').replace(/[^\w]/g, '_')}`,
      width: 12
    }));

    // Combine all columns
    worksheet.columns = [...baseColumns, ...testColumns];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // Add borders to header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Create a map of orders by visit ID for quick lookup
    const ordersByVisit = {};
    orders.forEach(order => {
      if (!ordersByVisit[order.visit]) {
        ordersByVisit[order.visit] = [];
      }
      ordersByVisit[order.visit].push(order);
    });

    // Add data rows
    visits.forEach((visit, index) => {
      const patient = visit.patient;
      
      if (!patient) {
        console.log(`Visit ${visit._id} has no patient data`);
        return;
      }

      // Get all lab tests for this visit
      const visitOrders = ordersByVisit[visit._id] || [];
      const labTests = new Set();
      
      console.log(`\n=== Processing visit ${visit.referenceNumber} ===`);
      console.log(`Found ${visitOrders.length} orders for this visit`);
      
      visitOrders.forEach((order, orderIndex) => {
        console.log(`\nOrder ${orderIndex + 1}:`, {
          orderId: order._id,
          itemsCount: order.items?.length || 0
        });
        
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item, itemIndex) => {
            console.log(`  Item ${itemIndex + 1}:`, {
              name: item.name,
              hasLabGroup: !!item.item,
              testsCount: item.item?.tests?.length || 0
            });
            
            if (item.item && item.item.tests && Array.isArray(item.item.tests)) {
              item.item.tests.forEach((test, testIndex) => {
                console.log(`    Test ${testIndex + 1}:`, {
                  testName: test.name,
                  testCode: test.code
                });
                
                if (test && test.name) {
                  labTests.add(test.name);
                  console.log(`    ✅ Added test: ${test.name}`);
                }
              });
            } else {
              console.log(`    ❌ No tests found for item: ${item.name}`);
            }
          });
        }
      });
      
      console.log(`\n📊 Total unique lab tests found: ${labTests.size}`);
      console.log(`Lab tests:`, Array.from(labTests));

      // Create row data with base information
      const rowData = {
        ln: visit.referenceNumber || '',
        hn: patient.ln || '',
        prefix: patient.prefix || '',
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        gender: patient.gender || '',
        age: patient.age || '',
        height: visit.height || '',
        rights: visit.rights || ''
      };

      // Mark lab tests that this patient has
      labTestColumns.forEach(testName => {
        const columnKey = `test_${testName.replace(/\s+/g, '_').replace(/[^\w]/g, '_')}`;
        
        // Check if patient has this test (exact match first)
        let hasTest = labTests.has(testName);
        
        // If no exact match, try partial matching for common variations
        if (!hasTest) {
          for (const dbTestName of labTests) {
            // Check if database test name contains our test name or vice versa
            if (dbTestName.toLowerCase().includes(testName.toLowerCase()) || 
                testName.toLowerCase().includes(dbTestName.toLowerCase())) {
              hasTest = true;
              console.log(`    🔄 Matched "${testName}" with database test "${dbTestName}"`);
              break;
            }
          }
        }
        
        rowData[columnKey] = hasTest ? '1' : '';
        
        if (hasTest) {
          console.log(`    ✅ Test "${testName}" marked with 1`);
        }
      });

      const row = worksheet.addRow(rowData);

      // Add borders to data rows
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }

      // Center align test result columns
      testColumns.forEach(col => {
        row.getCell(col.key).alignment = { horizontal: 'center' };
      });
    });

    // Auto-fit columns (approximate)
    worksheet.columns.forEach(column => {
      if (column.width < 8) column.width = 8;
      if (column.width > 15) column.width = 15;
    });

    // Set response headers
    const filename = `ข้อมูลนำเข้าห้องแลบ_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // Write to response
    await workbook.xlsx.write(res);
    console.log('Laboratory import Excel file generated successfully');

  } catch (error) {
    console.error('Error generating laboratory import Excel report:', error);
    res.status(500).json({ 
      error: 'Failed to generate laboratory import Excel report',
      details: error.message 
    });
  }
});

module.exports = router;
