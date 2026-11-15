import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // .audit 과 .claude 는 git 에 없는 로컬 전용 폴더다. 검사 대상에서 뺀다.
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.audit/**', '.claude/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // 스캐폴딩의 TODO 스텁은 아직 쓰지 않는 매개변수를 갖고 있다. `_` 로 시작하면 "일부러 안 쓴다" 는 표시다.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // scripts/ 는 완성본 실험 스크립트다(REVIEW 항목이 아니면 고치지 않는다). fetch 응답을 any 로 받는 줄은 그대로 둔다.
    files: ['scripts/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
