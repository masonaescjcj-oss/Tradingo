export type QuestionProps<S> = {
  step: S;
  /** Unit title, shown as the question's tag. */
  topic: string;
  /** True once the answer has been checked: inputs lock and the right answer shows. */
  revealed: boolean;
  /** Reports the current answer: true/false once complete, null while incomplete. */
  onAnswer: (correct: boolean | null) => void;
};
