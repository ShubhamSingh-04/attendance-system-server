// hash_admin.js
import bcrypt from 'bcryptjs';

const hashPassword = async () => {
  const plainPassword = '12345'; // <-- SET YOUR ADMIN PASSWORD HERE

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(plainPassword, salt);

    console.log('Your hashed password:');
    console.log(hash); // <-- COPY THIS HASH
  } catch (error) {
    console.error('Error hashing password:', error);
  }
};

hashPassword();
