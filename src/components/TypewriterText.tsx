import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  texts: string[];
  speed?: number;
  delay?: number;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ 
  texts, 
  speed = 150, 
  delay = 2000 
}) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);

  useEffect(() => {
    const typeText = () => {
      const fullText = texts[currentTextIndex];
      
      if (isWaiting) {
        setTimeout(() => {
          setIsWaiting(false);
          setIsDeleting(true);
        }, delay);
        return;
      }

      if (isDeleting) {
        if (currentText === '') {
          setIsDeleting(false);
          setCurrentTextIndex((prev) => (prev + 1) % texts.length);
          return;
        }
        
        setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, speed / 2);
      } else {
        if (currentText === fullText) {
          setIsWaiting(true);
          return;
        }
        
        setTimeout(() => {
          setCurrentText(fullText.slice(0, currentText.length + 1));
        }, speed);
      }
    };

    const timer = setTimeout(typeText, isWaiting ? delay : speed);
    return () => clearTimeout(timer);
  }, [currentText, currentTextIndex, isDeleting, isWaiting, texts, speed, delay]);

  return (
    <span className="inline-block">
      {currentText}
      <span className="animate-pulse text-blue-600 dark:text-blue-400 font-bold">|</span>
    </span>
  );
};

export default TypewriterText; 