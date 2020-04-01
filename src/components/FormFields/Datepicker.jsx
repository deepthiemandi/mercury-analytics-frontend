import React, { useState, useEffect } from 'react';
import styles from './Datepicker.module.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FaRegCalendarAlt } from 'react-icons/fa';

const Datepicker = props => {
  const { field, label, disabled, placeholder } = props;
  const [value, setValue] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const classes = `
    ${styles.container}
    ${props.className}
    ${isOpen ? styles.open : ''}
    ${disabled ? styles.disabled : ''}
  `;

  const togglePicker = (event) => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
    event.stopPropagation();
  };

  const handleChange = (date) => {
    setValue(date);
    setIsOpen(false);
    if (field) {
      field.input.onChange(date.toString());
    }
  };

  useEffect(() => {
    if (field.input.value.length) {
      setValue(new Date(field.input.value));
    } else {
      setValue(null);
    }
  }, [field.input.value]);

  return (
    <div className={classes}>
      {!!label && (
        <label>{label}</label>
      )}
      <div className={styles.controlWrapper}>
        <DatePicker
          className={styles.control}
          wrapperClassName={styles.pickerWrapper}
          popperPlacement={'top-end'}
          popperClassName={styles.picker}
          customInput={
            <input
              {...field.input}
              disabled={!!disabled}
              placeholder={placeholder}
            />
          }
          selected={value}
          dateFormat={'EEEE, MMMM dd, yyyy'}
          disabled={!!disabled}
          open={isOpen}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          onClickOutside={() => setIsOpen(false)}
        />
        <FaRegCalendarAlt className={styles.controlIcon} onClick={togglePicker} />
      </div>
      {field.meta.touched && field.meta.error && (
        <div className={styles.error}>{field.meta.error}</div>
      )}
    </div>
  );
};

export default Datepicker;
