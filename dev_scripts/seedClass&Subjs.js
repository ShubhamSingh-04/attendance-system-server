import mongoose from 'mongoose';
import { Class } from '../models/Class.js';
import { Subject } from '../models/Subject.js';
import dotenv from 'dotenv';

await dotenv.config();

// --- Configuration ---
// Make sure your MongoDB server is running!
// Update this URI if your database is not running on localhost.
const MONGO_URI = process.env.MONGO_URI;

// --- Data Definitions ---

const departmentName = 'Computer Science & Business Systems';

const sem5SubjectsData = [
  { name: 'Fundamentals of Management', subjectCode: 'BCB501' },
  { name: 'Computer Networks', subjectCode: 'BCS502' },
  { name: 'Theory of Computation', subjectCode: 'BCS503' },
  { name: 'Computational Statistics Lab', subjectCode: 'BCBL504' },
  { name: 'Marketing Research & Marketing Management', subjectCode: 'BCB515A' },
  { name: 'Mini Project', subjectCode: 'BCB586' },
  { name: 'Research Methodology and IPR', subjectCode: 'BRMK557' },
  { name: 'Environmental Studies', subjectCode: 'BCS508' },
  { name: 'Physical Education (PE)', subjectCode: 'BPEK559' },
];

const sem6SubjectsData = [
  { name: 'Artificial Intelligence for Business', subjectCode: 'BCB601' },
  { name: 'Machine Learning', subjectCode: 'BCB602' },
  { name: 'Supply Chain Management', subjectCode: 'BCB613B' },
  { name: 'Project Phase I', subjectCode: 'BCB685' },
  { name: 'Machine Learning lab', subjectCode: 'BCBL606' },
  { name: 'Devops', subjectCode: 'BCB657D' },
  { name: 'Physical Education (PE)', subjectCode: 'BPEK658' },
  { name: 'Indian Knowledge System', subjectCode: 'BIKS609' },
];

const sem7SubjectsData = [
  { name: 'Business Intelligence and Data Analytics', subjectCode: 'BCB701' },
  { name: 'Parallel Computing', subjectCode: 'BCS702' },
  { name: 'Cryptography and Network Security', subjectCode: 'BCS703' },
  { name: 'Total Quality Management', subjectCode: 'BCB714B' },
  // NOTE: 'BCB' was not unique. I've assigned 'BCB785' as a placeholder.
  { name: 'Major Project Phase-II', subjectCode: 'BCB785' },
];

// --- Seeding Function ---

const seedDatabase = async () => {
  try {
    console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('Successfully connected to MongoDB.');

    // Clear existing data
    console.log('Clearing old data...');
    await Subject.deleteMany({});
    await Class.deleteMany({});
    console.log('Old data cleared.');

    // Create Class documents
    console.log('Creating Class documents...');
    const class5 = await Class.create({
      name: `${departmentName} - Sem 5`,
      classCode: 'CSBS-5',
      semester: 5,
      location: 'CSBS Block - Room 501',
    });

    const class6 = await Class.create({
      name: `${departmentName} - Sem 6`,
      classCode: 'CSBS-6',
      semester: 6,
      location: 'CSBS Block - Room 601',
    });

    const class7 = await Class.create({
      name: `${departmentName} - Sem 7`,
      classCode: 'CSBS-7',
      semester: 7,
      location: 'CSBS Block - Room 701',
    });
    console.log('Class documents created.');

    // Prepare Subject documents with correct Class references
    const allSubjects = [
      ...sem5SubjectsData.map((sub) => ({
        ...sub,
        class: class5._id,
        semester: 5,
      })),
      ...sem6SubjectsData.map((sub) => ({
        ...sub,
        class: class6._id,
        semester: 6,
      })),
      ...sem7SubjectsData.map((sub) => ({
        ...sub,
        class: class7._id,
        semester: 7,
      })),
    ];

    // Insert all subjects
    console.log('Inserting Subject documents...');
    await Subject.create(allSubjects);
    console.log(
      `Successfully inserted ${allSubjects.length} subject documents.`
    );

    console.log('Database seeded successfully! 🚀');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
};

// Run the seeder
seedDatabase();
