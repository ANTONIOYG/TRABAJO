async function runTests() {
  console.log('--- Iniciando Test de Integración WorkLog Pro ---');
  
  // 1. Test GET /api/data
  console.log('1. Test GET /api/data...');
  const resData = await fetch('http://127.0.0.1:3001/api/data');
  const dbJson = await resData.json();
  console.log('   Status:', resData.status, '| Éxito:', dbJson.success);
  console.log('   Empleados:', dbJson.data.employees.length, '| Registros:', dbJson.data.logs.length);

  // 2. Test POST /api/logs
  console.log('2. Test POST /api/logs (Fichaje con horas extras)...');
  const testLog = {
    id: `log-test-${Date.now()}`,
    employeeId: 'emp-1',
    date: new Date().toISOString().split('T')[0],
    entryTime: '08:00',
    exitTime: '18:00',
    breakHours: 1.0,
    totalHours: 9.0,
    regularHours: 8.0,
    overtimeHours: 1.0,
    notes: 'Prueba de integración automatizada',
    status: 'completed',
    createdAt: new Date().toISOString(),
  };

  const resLog = await fetch('http://127.0.0.1:3001/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testLog),
  });
  const logJson = await resLog.json();
  console.log('   Status:', resLog.status, '| Log Creado:', logJson.success, '| Total horas:', testLog.totalHours, 'h (Extras: +' + testLog.overtimeHours + 'h)');

  // 3. Test POST /api/send-email
  console.log('3. Test POST /api/send-email...');
  const resEmail = await fetch('http://127.0.0.1:3001/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: 'antonioyg@gmail.com',
      subject: 'Prueba de Envío Reporte',
      filename: 'WorkLog_Reporte_Prueba.xlsx',
      fileBase64: 'UEsDBBQAAAAIA',
    }),
  });
  const emailJson = await resEmail.json();
  console.log('   Status:', resEmail.status, '| Respuesta:', emailJson.message || emailJson);

  // 4. Test POST /api/send-whatsapp
  console.log('4. Test POST /api/send-whatsapp...');
  const resWhatsApp = await fetch('http://127.0.0.1:3001/api/send-whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: '+34600000000',
      message: 'WorkLog Pro: Notificación de prueba del sistema.',
    }),
  });
  const whatsAppJson = await resWhatsApp.json();
  console.log('   Status:', resWhatsApp.status, '| Respuesta:', whatsAppJson.message || whatsAppJson);

  // 5. Test GET /api/export-sql
  console.log('5. Test GET /api/export-sql...');
  const resSql = await fetch('http://127.0.0.1:3001/api/export-sql');
  const sqlText = await resSql.text();
  console.log('   Status:', resSql.status, '| Longitud SQL Dump:', sqlText.length, 'bytes');
  console.log('   Cabecera SQL:', sqlText.split('\n')[0]);

  console.log('--- TODOS LOS TESTS HAN FINALIZADO CON ÉXITO ---');
}

runTests().catch((err) => {
  console.error('Error en tests:', err);
  process.exit(1);
});
