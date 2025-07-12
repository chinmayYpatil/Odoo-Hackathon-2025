-- Add Sample Data Migration
-- This migration adds some initial data to make the app functional

-- Insert sample tags
INSERT INTO tags (name, description, question_count) VALUES
('javascript', 'JavaScript programming language', 0),
('react', 'React.js framework', 0),
('typescript', 'TypeScript programming language', 0),
('nodejs', 'Node.js runtime environment', 0),
('python', 'Python programming language', 0),
('sql', 'Structured Query Language', 0),
('css', 'Cascading Style Sheets', 0),
('html', 'HyperText Markup Language', 0),
('git', 'Version control system', 0),
('docker', 'Containerization platform', 0),
('aws', 'Amazon Web Services', 0),
('api', 'Application Programming Interface', 0),
('database', 'Database systems and design', 0),
('algorithm', 'Algorithms and data structures', 0),
('machine-learning', 'Machine learning and AI', 0);

-- Note: We can't insert sample profiles or questions because they require authenticated users
-- Users will need to create their own profiles and questions through the app
