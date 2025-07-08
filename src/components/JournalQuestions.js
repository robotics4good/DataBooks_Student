import React, { useRef, useLayoutEffect } from 'react';
import { useJournal } from "../JournalContext";

// Journal questions configuration
export const JOURNAL_QUESTIONS = [
  "What were your initial thoughts or feelings about the game when you first saw it?",
  "Describe your strategy during the game. Did it change over time?",
  "What was the most challenging part of the game for you?",
  "Were there any moments that you found particularly surprising or interesting?",
  "If you could change one thing about the game, what would it be and why?",
  "How did this game make you think about the real-world topic it represents?",
  "If you played before, how did this round compare to your previous experiences?",
  "If you were a researcher, what data would you collect from this game?",
  "What part of the game was most engaging?",
  "What part of the game was most confusing?",
  "How many times did you try the game?",
  "What was your final score?",
  "How do you think the creators of this game want you to feel?",
  "What is the key takeaway from the game?",
  "If you got infected, what time did it happen?",
  "How do you think the vaccine affected the spread this time?",
  "Is there anything else you would like to share about your experience?"
];

// Auto-resizing textarea component
const AutoResizingTextarea = ({ value, onChange, onBlur, ...props }) => {
  const textareaRef = useRef(null);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 50)}px`;
    }
  }, [value]);

  return <textarea ref={textareaRef} value={value} onChange={onChange} onBlur={onBlur} {...props} />;
};

// Question box component
export const QuestionBox = ({ question, index, logAction, styles = {} }) => {
  const { journalAnswers, setJournalAnswer } = useJournal();
  const answer = journalAnswers[index] || "";
  
  const handleAnswerChange = (e) => {
    setJournalAnswer(index, e.target.value);
  };

  const handleAnswerBlur = (e) => {
    const value = e.target.value;
    const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
    logAction(`journal_entry`, `Question ${index + 1} word_count: ${wordCount}`);
  };

  const defaultStyles = {
    questionBox: { marginBottom: '1rem' },
    questionLabel: { 
      display: 'block', 
      marginBottom: '0.5rem', 
      fontWeight: 'bold' 
    },
    textarea: {
      width: "100%",
      minHeight: '50px',
      background: "var(--cream-panel)",
      color: "var(--text-dark)",
      border: "1px solid var(--panel-border)",
      borderRadius: "4px",
      padding: "0.5rem",
      resize: "none",
      boxSizing: 'border-box',
      margin: 0,
    }
  };

  const mergedStyles = {
    questionBox: { ...defaultStyles.questionBox, ...styles.questionBox },
    questionLabel: { ...defaultStyles.questionLabel, ...styles.questionLabel },
    textarea: { ...defaultStyles.textarea, ...styles.textarea }
  };

  return (
    <div style={mergedStyles.questionBox}>
      <label style={mergedStyles.questionLabel}>
        {question}
      </label>
      <AutoResizingTextarea
        placeholder="Your answer..."
        value={answer}
        onChange={handleAnswerChange}
        onBlur={handleAnswerBlur}
        style={mergedStyles.textarea}
      />
    </div>
  );
};

// Main journal questions component
export const JournalQuestions = ({ logAction, styles = {} }) => {
  return (
    <div>
      <h3>Journal</h3>
      {JOURNAL_QUESTIONS.map((question, index) => (
        <QuestionBox 
          key={index} 
          question={question} 
          index={index} 
          logAction={logAction}
          styles={styles}
        />
      ))}
    </div>
  );
};

export default JournalQuestions; 