// Checks if the user is an Admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next(); // User is an Admin, proceed
  } else {
    res.status(403); // 403 Forbidden
    throw new Error('Not authorized as an Admin');
  }
};

// Checks if the user is a Teacher
const isTeacher = (req, res, next) => {
  if (req.user && req.user.role === 'Teacher') {
    next(); // User is a Teacher, proceed
  } else {
    res.status(403);
    throw new Error('Not authorized as a Teacher');
  }
};

// Checks if the user is a Student
const isStudent = (req, res, next) => {
  if (req.user && req.user.role === 'Student') {
    next(); // User is a Student, proceed
  } else {
    // 💡 FIX: Was res.status(4D), changed to 403
    res.status(403);
    throw new Error('Not authorized as a Student');
  }
};

// Export them all
export default { isAdmin, isTeacher, isStudent };
