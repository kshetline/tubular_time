import chaiFriendly from 'eslint-plugin-chai-friendly';
import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    plugins: {
      '@stylistic': stylistic,
      'chai-friendly': chaiFriendly,
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...stylistic.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      ...tsPlugin.configs['recommended-requiring-type-checking'].rules,

      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',

      '@stylistic/arrow-parens': ['error', 'as-needed'],
      '@stylistic/brace-style': [
        'error',
        'stroustrup',
        {
          allowSingleLine: true
        }
      ],
      '@stylistic/camelcase': 'off',
      '@stylistic/comma-dangle': [
        'error',
        {
          arrays: 'only-multiline',
          objects: 'only-multiline',
          imports: 'only-multiline',
          exports: 'only-multiline',
          functions: 'never'
        }
      ],
      '@stylistic/curly': 'off',
      '@/eqeqeq': ['error', 'smart'],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'no-public'
        }
      ],
      '@stylistic/indent': [
        'error',
        2,
        {
          ArrayExpression: 'first',
          CallExpression: { arguments: 'off' },
          FunctionDeclaration: { parameters: 'off' },
          FunctionExpression: { parameters: 'off' },
          ignoreComments: true,
          ignoredNodes: [
            'ClassProperty[value]',
            'TSTypeAnnotation > TSFunctionType',
            'NewExpression[arguments] :expression *'
          ],
          ObjectExpression: 'first',
          SwitchCase: 1
        }
      ],
      '@stylistic/indent-binary-ops': 'off',
      '@stylistic/key-spacing': 'off',
      '@stylistic/max-statements-per-line': 'off',
      '@stylistic/member-delimiter-style': 'error',
      '@stylistic/multiline-ternary': 'off',
      '@stylistic/no-control-regex': 'off',
      '@stylistic/no-empty': 'off',
      '@stylistic/no-labels': 'off',
      '@stylistic/no-mixed-operators': 'off',
      '@stylistic/no-multi-spaces': 'off',
      '@stylistic/no-new': 'off',
      '@stylistic/no-return-assign': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@/no-useless-constructor': 'error',
      '@stylistic/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'chai-friendly/no-unused-expressions': 'error',
      '@/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: false,
          vars: 'all'
        }
      ],
      'one-var': 'off',
      '@stylistic/operator-linebreak': 'off',
      '@stylistic/semi': [
        'error',
        'always'
      ],
      'space-before-function-paren': [
        'error',
        {
          anonymous: 'always',
          named: 'never',
          asyncArrow: 'always'
        }
      ],
      '@stylistic/quotes': [
        'error',
        'single',
        {
          allowTemplateLiterals: true,
          avoidEscape: true
        }
      ],
      '@typescript-eslint/restrict-plus-operands': 'off',
      'yoda': [
        'error',
        'never',
        {
          exceptRange: true
        }
      ]
    },
    files: ['**/*.js', '**/*.mjs', '**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.eslint.json'
      }
    }
  }
];
