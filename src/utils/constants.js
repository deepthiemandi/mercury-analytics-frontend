let Constants, env = process.env.NODE_ENV;

const prod = {
  APP_URL: 'https://mercury-analytics-frontend.herokuapp.com',
  API_URL: 'https://mercury-analytics-api.herokuapp.com',
};

const dev = {
  APP_URL: 'http://localhost:3000',
  API_URL: 'http://localhost:3002',
};

export default Constants = env !== 'development' ? prod : dev;;


