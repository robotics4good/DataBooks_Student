import React, { useRef, useLayoutEffect, useState } from 'react';
import { useJournal } from "../JournalContext";
import { db, ref, set, get } from "../firebase";
import { logAction } from "../services/userActionLogger";
import { getSanDiegoIsoString } from '../utils/timeUtils';

// Journal questions configuration
export const JOURNAL_QUESTIONS = [
  // ROUND 1
  "Welcome to your Mission Journal, cadet! To get started, enter your codename.",
  "How many sectors are there on S.S. Astra?",
  "Look around the room, how many cadets are there in total [remember to count yourself!]?",
  "During this round you completed a task with a partner cadet, what task did you complete as a team?",
  "Write down the codename of your partner cadet for this task.",
  "Given that you know that on this ship there is a sector that is infected, do you suspect that you or your partner cadet have become infected after this round?",
  "On the top right there is an option to \"Go Dual Screen\" or \"Go Single Screen.\" How does the view change when you \"Go Dual Screen\"?",
  "Set your view to Dual Screen where the Journal and plot are side-by-side. Now, let's explore the data plots tab above. Click the \"Plot Options\" dropdown menu, how many types of data plots do you see?",
  "In the data plots section, notice how there are many variables that you can choose from. As our first plot, let's focus on analyzing one specific variable. Using the dropdown menu, pick either a histogram or a pie plot and click the box for \"Infected Cadets.\" From the plot, report how many cadets are infected.",
  "Great! What information did the plot you chose provide that helped you to answer the previous question?",
  // ROUND 2
  "Report the letter of the sector (A, B, etc) you visited in this round.",
  "Write down the codename of your partner cadet for this task.",
  "Did you work with the same cadet as in Round 1? If so, why?",
  "Now that you have participated in 2 Rounds of tasks on the S.S. Astra, we urge you to start thinking about how the infection is spreading. As we are still collectively trying to fight these infections, we need your help! Without changing the rules of the game, what do you suggest the cadets should do to lessen the spread?",
  "Head back to the data plots tab. This time, let's compare two different variables using one of the scatter, line, or bar plot options from the dropdown menu. For the 'x' axis, let's click \"Time,\" and for the 'y' axis, let's click \"Infected Cadets.\" With this plot, would you say that the number of infected cadets has increased over time?",
  "What makes the scatter, line, or bar plots helpful in answering the previous question? Hint: How many variables did you click for your plot in Round 1 as compared to Round 2?",
  // ROUND 3
  "Earlier in Journal 2, we asked if you stayed with the same partner for your Round 1 and 2 tasks. Did you pick a new partner (different from Round 1 AND Round 2) for this task? Do you think that changing partners might increase the chance of you getting infected? In a few words, explain your reasoning.",
  "Now, head back to the data plots tab. Similar to Round 2, we will be examining two variables at one time. You will use a line, scatter, or bar plot for this question (the choice is yours!). This time, let's keep our 'x' axis as \"Time\" but change our 'y' axis to \"Infected Sectors.\" Examine how the number of infected sectors has changed over time. Write down your observations from this plot.",
  "Lastly, change the 'x' variable to 'Meetings Held.' Once again, write down your observations for this plot.",
  "Between the two plots you looked at for Questions 18 and 19 explain what similarities you notice between the results of the plots.",
  "What type of plot do you think is most useful for trying to solve the problem of limiting infection spread throughout the S.S. Astra?"
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
export const QuestionBox = ({ question, index, logAction: _logAction, styles = {}, journalNumber }) => {
  const { journalAnswers, setJournalAnswer } = useJournal();
  const answer = journalAnswers[index] || "";
  
  const handleAnswerChange = (e) => {
    setJournalAnswer(index, e.target.value);
  };

  const handleFocus = () => {
    logAction({
      type: "journal_entry",
      action: "click_on",
      details: { journalNumber, questionIndex: index }
    });
  };

  const handleBlur = (e) => {
    const value = e.target.value;
    const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
    logAction({
      type: "journal_entry",
      action: "click_off",
      details: { journalNumber, questionIndex: index, wordCount }
    });
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
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={mergedStyles.textarea}
      />
    </div>
  );
};

function sanitizeForFirebaseKey(str) {
  // Replace any character not allowed in Firebase keys with '_'
  return str.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Explicitly group questions by round
const ROUND_QUESTIONS = [
  [ // Round 1
    "Welcome to your Mission Journal, cadet! To get started, enter your codename.",
    "How many sectors are there on S.S. Astra?",
    "Look around the room, how many cadets are there in total [remember to count yourself!]?",
    "During this round you completed a task with a partner cadet, what task did you complete as a team?",
    "Write down the codename of your partner cadet for this task.",
    "Given that you know that on this ship there is a sector that is infected, do you suspect that you or your partner cadet have become infected after this round?",
    "On the top right there is an option to \"Go Dual Screen\" or \"Go Single Screen.\" How does the view change when you \"Go Dual Screen\"?",
    "Set your view to Dual Screen where the Journal and plot are side-by-side. Now, let's explore the data plots tab above. Click the \"Plot Options\" dropdown menu, how many types of data plots do you see?",
    "In the data plots section, notice how there are many variables that you can choose from. As our first plot, let's focus on analyzing one specific variable. Using the dropdown menu, pick either a histogram or a pie plot and click the box for \"Infected Cadets.\" From the plot, report how many cadets are infected.",
    "Great! What information did the plot you chose provide that helped you to answer the previous question?"
  ],
  [ // Round 2
    "Report the letter of the sector (A, B, etc) you visited in this round.",
    "Write down the codename of your partner cadet for this task.",
    "Did you work with the same cadet as in Round 1? If so, why?",
    "Now that you have participated in 2 Rounds of tasks on the S.S. Astra, we urge you to start thinking about how the infection is spreading. As we are still collectively trying to fight these infections, we need your help! Without changing the rules of the game, what do you suggest the cadets should do to lessen the spread?",
    "Head back to the data plots tab. This time, let's compare two different variables using one of the scatter, line, or bar plot options from the dropdown menu. For the 'x' axis, let's click \"Time,\" and for the 'y' axis, let's click \"Infected Cadets.\" With this plot, would you say that the number of infected cadets has increased over time?",
    "What makes the scatter, line, or bar plots helpful in answering the previous question? Hint: How many variables did you click for your plot in Round 1 as compared to Round 2?"
  ],
  [ // Round 3
    "Earlier in Journal 2, we asked if you stayed with the same partner for your Round 1 and 2 tasks. Did you pick a new partner (different from Round 1 AND Round 2) for this task? Do you think that changing partners might increase the chance of you getting infected? In a few words, explain your reasoning.",
    "Now, head back to the data plots tab. Similar to Round 2, we will be examining two variables at one time. You will use a line, scatter, or bar plot for this question (the choice is yours!). This time, let's keep our 'x' axis as \"Time\" but change our 'y' axis to \"Infected Sectors.\" Examine how the number of infected sectors has changed over time. Write down your observations from this plot.",
    "Lastly, change the 'x' variable to 'Meetings Held.' Once again, write down your observations for this plot.",
    "Between the two plots you looked at for Questions 18 and 19 explain what similarities you notice between the results of the plots.",
    "What type of plot do you think is most useful for trying to solve the problem of limiting infection spread throughout the S.S. Astra?"
  ]
];

export const JournalQuestions = ({ logAction: _logAction, styles = {}, id }) => {
  const { journalAnswers } = useJournal();
  const [submitting, setSubmitting] = useState([false, false, false]);
  const [showSuccess, setShowSuccess] = useState([false, false, false]);

  // Round headings and instructions
  const roundHeadings = [
    {
      title: 'Round 1 Questions',
      instructions: 'Answer the following questions in Journal 1 after finishing your first task!\nJournal #1:'
    },
    {
      title: 'Round 2 Questions',
      instructions: 'Answer the following questions in Journal 2 after finishing your second task!\nJournal #2:'
    },
    {
      title: 'Round 3 Questions',
      instructions: 'Answer the following questions in Journal 3 after finishing your third task!\nJournal #3:'
    }
  ];

  const getSessionId = async () => {
    const sessionIdRef = ref(db, 'activeSessionId');
    const snapshot = await get(sessionIdRef);
    return snapshot.exists() ? snapshot.val() : null;
  };

  const handleSubmit = async (round) => {
    setSubmitting(prev => {
      const copy = [...prev];
      copy[round - 1] = true;
      return copy;
    });
    try {
      const sessionId = await getSessionId();
      if (!sessionId) {
        setSubmitting(prev => { const copy = [...prev]; copy[round - 1] = false; return copy; });
        return;
      }
      const studentId = id || (typeof window !== 'undefined' ? localStorage.getItem('selectedPlayer') : '');
      if (!studentId) {
        setSubmitting(prev => { const copy = [...prev]; copy[round - 1] = false; return copy; });
        return;
      }
      // Calculate the flat index offset for this round
      let offset = 0;
      for (let r = 0; r < round - 1; r++) offset += ROUND_QUESTIONS[r].length;
      const timestamp = getSanDiegoIsoString();
      const sanitizedTimestamp = sanitizeForFirebaseKey(timestamp);
      const answers = {};
      for (let i = 0; i < ROUND_QUESTIONS[round-1].length; i++) {
        answers[offset + i + 1] = journalAnswers[offset + i] || "";
      }
      const entry = {
        round,
        timestamp,
        answers
      };
      const entryPath = `sessions/${sessionId}/JournalEntries/${studentId}/Journal${round}${sanitizedTimestamp}`;
      await set(ref(db, entryPath), entry);
      setShowSuccess(prev => {
        const copy = [...prev];
        copy[round - 1] = true;
        return copy;
      });
      setTimeout(() => {
        setShowSuccess(prev => {
          const copy = [...prev];
          copy[round - 1] = false;
          return copy;
        });
      }, 2500);
    } catch (err) {
      // Optionally show error notification
    }
    setSubmitting(prev => { const copy = [...prev]; copy[round - 1] = false; return copy; });
  };

  return (
    <div>
      <h3 style={{ textAlign: 'center', marginBottom: 32 }}>Journal</h3>
      {ROUND_QUESTIONS.map((questions, roundIdx) => {
        // Calculate the flat index offset for this round
        let offset = 0;
        for (let r = 0; r < roundIdx; r++) offset += ROUND_QUESTIONS[r].length;
        return (
          <div key={roundIdx} style={{ marginBottom: '3.5rem', background: 'none' }}>
            <div style={{ textAlign: 'center', margin: '32px 0 12px 0' }}>
              <div style={{ fontWeight: 700, fontSize: '2rem', marginBottom: 8 }}>{roundHeadings[roundIdx].title}</div>
              <div style={{ fontSize: '1.15rem', marginBottom: 8, color: '#222' }}>
                {roundHeadings[roundIdx].instructions.split('\n').map((line, i) => <div key={i}>{line}</div>)}
              </div>
            </div>
            {questions.map((question, idx) => (
              <QuestionBox
                key={offset + idx}
                question={question}
                index={offset + idx}
                logAction={logAction}
                styles={styles}
                journalNumber={roundIdx + 1}
              />
            ))}
            <button
              onClick={async () => {
                await handleSubmit(roundIdx + 1);
                // Log submit action
                const answeredCount = questions.filter((_, i) => {
                  const ans = journalAnswers[offset + i];
                  return ans && ans.trim().length > 0;
                }).length;
                const totalQuestions = questions.length;
                const totalWords = questions.reduce((sum, _, i) => {
                  const ans = journalAnswers[offset + i] || "";
                  return sum + (ans.trim() ? ans.trim().split(/\s+/).length : 0);
                }, 0);
                logAction({
                  type: "journal_entry",
                  action: "submit",
                  details: {
                    journalNumber: roundIdx + 1,
                    answeredCount,
                    totalQuestions,
                    totalWords
                  }
                });
              }}
              disabled={submitting[roundIdx]}
              style={{
                display: 'block',
                width: '135px',
                margin: '32px auto 0 auto',
                padding: '10.5px 0',
                fontSize: '1.125rem',
                fontWeight: 'bold',
                borderRadius: '9px',
                background: '#3ee37c',
                color: 'white',
                border: 'none',
                cursor: submitting[roundIdx] ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
              }}
            >
              {submitting[roundIdx] ? 'Submitting...' : 'Submit'}
            </button>
            {showSuccess[roundIdx] && (
              <div style={{
                background: '#3ee37c',
                color: 'white',
                borderRadius: '8px',
                padding: '10px 24px',
                margin: '18px auto 0 auto',
                width: 'fit-content',
                fontWeight: 600,
                fontSize: '1rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
              }}>
                Submitted!
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default JournalQuestions; 