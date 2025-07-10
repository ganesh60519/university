const pool = require('./db');

async function checkUsers() {
  try {
    console.log('🔍 Checking existing users in database...\n');
    
    // Check students
    const [students] = await pool.query('SELECT id, name, email FROM students LIMIT 5');
    console.log('👨‍🎓 Students:');
    students.forEach(student => {
      console.log(`  - ${student.name} (${student.email})`);
    });
    
    // Check faculty
    const [faculty] = await pool.query('SELECT id, name, email FROM faculty LIMIT 5');
    console.log('\n👨‍🏫 Faculty:');
    faculty.forEach(f => {
      console.log(`  - ${f.name} (${f.email})`);
    });
    
    // Check admin
    const [admin] = await pool.query('SELECT id, name, email FROM admin LIMIT 5');
    console.log('\n👨‍💼 Admin:');
    admin.forEach(a => {
      console.log(`  - ${a.name} (${a.email})`);
    });
    
    console.log('\n✅ Use any of these emails to test forget password functionality');
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    process.exit(0);
  }
}

checkUsers();