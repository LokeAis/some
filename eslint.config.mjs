import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    files: ['firestore.rules'],
    languageOptions: {
      parser: firebaseRulesPlugin.configs['flat/recommended'].parser,
    },
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
