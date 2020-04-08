import React from 'react';
import styles from './Button.module.css';
import { Link } from 'react-router-dom';
import Loader from './Loader';

const renderLoader = () => (
  <Loader inline size={3} className={styles.loader} />
);

const Button = props => {
  const { loading } = props;
  const baseClasses = `
    ${styles.container}
    ${props.transparent ? styles.transparent : ''}
    ${props.disabled ? styles.disabled : ''}
    ${props.className || ''}
  `;

  return !!props.link ? (
    <Link className={`${baseClasses} ${styles.link}`} to={props.link} target={props.target || '_self'}>
      {props.children}
      {!!loading && renderLoader()}
    </Link>
  ) : (
    <button type={props.type || 'button'} disabled={!!props.disabled} className={`${baseClasses}`} onClick={props.onClick}>
      {props.children}
      {!!loading && renderLoader()}
    </button>
  );
};

export default Button;
