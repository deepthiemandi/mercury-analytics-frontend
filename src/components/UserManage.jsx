import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styles from './UserManage.module.css';
import Loader from './Loader';
import Button from './Button';
import { useForm, useField } from 'react-final-form-hooks';
import { Input } from './FormFields';
import { getUser, createUser, updateUser } from '../store/users/actions';

const UserManage = props => {
  const { id, embeded, preview } = props;
  const dispatch = useDispatch();
  const editMode = !isNaN(id);
  const [isBusy, setIsBusy] = useState(false);
  const data = useSelector(state =>
    editMode ? state.usersReducer.users.filter(u => u.id === id)[0] : null);

  useEffect(() => {
    if (!isNaN(id)) {
      dispatch(getUser(id));
    }
  }, [id]);

  const { form, handleSubmit, pristine, submitting } = useForm({
    initialValues: data ? {
      email: data.email || '',
      // company_name: data.company_name || '',
      contact_name: data.contact_name || '',
      contact_title: data.contact_title || '',
      contact_phone: data.contact_phone || '',
      contact_fax: data.contact_fax || '',
      contact_email: data.contact_email || '',
      mailing_address_1: data.mailing_address_1 || '',
      mailing_city: data.mailing_city || '',
      mailing_state: data.mailing_state || '',
      mailing_zip: data.mailing_zip || '',
      mailing_country: data.mailing_country || '',
    } : {},
    validate: (values) => {
      let errors = {};
      [
        'email', 'contact_name', 'contact_phone', 'contact_email',
        'mailing_address_1', 'mailing_city', 'mailing_state', 'mailing_zip',
      ].forEach(key => {
        if (!values[key]) {
          errors[key] = 'Field value is required.'
        }
      });
      return errors;
    },
    onSubmit: (values) => {
      setIsBusy(true);
      const result = {
        email: values.email,
        // company_name: values.company_name,
        contact_name: values.contact_name,
        contact_title: values.contact_title,
        contact_phone: values.contact_phone,
        contact_fax: values.contact_fax,
        contact_email: values.contact_email,
        mailing_address_1: values.mailing_address_1,
        mailing_city: values.mailing_city,
        mailing_state: values.mailing_state,
        mailing_zip: values.mailing_zip,
        mailing_country: values.mailing_country,
      };
      if (data) {
        dispatch(updateUser(data.id, result)).then(() => {
          form.reset();
          setIsBusy(false);
        });
      } else {
        // @TODO get Client id
        // dispatch(createUser(result));
      }
    },
  });

  const email = useField('email', form);
  // const company_name = useField('company_name', form);
  const contact_name = useField('contact_name', form);
  const contact_title = useField('contact_title', form);
  const contact_phone = useField('contact_phone', form);
  const contact_fax = useField('contact_fax', form);
  const contact_email = useField('contact_email', form);
  const mailing_address_1 = useField('mailing_address_1', form);
  const mailing_city = useField('mailing_city', form);
  const mailing_state = useField('mailing_state', form);
  const mailing_zip = useField('mailing_zip', form);
  const mailing_country = useField('mailing_country', form);

  return (
    <div className={`${styles.container} ${embeded ? styles.embed : ''}`}>
      <div className={styles.section}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formSection}>
            <div className={styles.title}>
              <span>Account details</span>
            </div>
            <div className={styles.controlsGroup}>
              <Input
                className={styles.formControl}
                field={email}
                label="Account name *"
              />
              {/* <Input
                className={styles.formControl}
                field={company_name}
                disabled={true}
                label="Company name"
              /> */}
            </div>
          </div>
          <div className={styles.formSection}>
            <div className={styles.title}>
              <span>Primary contact</span>
            </div>
            <div className={styles.controlsGroup}>
              <Input
                className={styles.formControl}
                field={contact_name}
                label="Name *"
              />
              <Input
                className={styles.formControl}
                field={contact_title}
                label="Title"
              />
            </div>
            <div className={styles.controlsGroup}>
              <Input
                className={styles.formControl}
                field={contact_phone}
                label="Phone number *"
              />
              <Input
                className={styles.formControl}
                field={contact_fax}
                label="Fax number"
              />
            </div>
            <Input
              className={styles.formControl}
              field={contact_email}
              label="Email *"
            />
            <div className={styles.controlsGroup}>
              <Input
                className={styles.formControl}
                field={mailing_address_1}
                label="Address *"
              />
              <Input
                className={styles.formControl}
                field={mailing_city}
                label="City *"
              />
            </div>
            <div className={styles.controlsGroup}>
              <Input
                className={styles.formControl}
                field={mailing_state}
                label="State *"
              />
              <Input
                className={styles.formControl}
                field={mailing_zip}
                label="Zip code *"
              />
            </div>
            <div className={styles.controlsGroup}>
              <Input
                className={styles.formControl}
                field={mailing_country}
                label="Country"
              />
            </div>
          </div>
          {!preview && (
            <div className={styles.formButtons}>
              <Button type="submit" disabled={submitting}>
                <span>{editMode ? (!isBusy ? 'Update' : 'Updating') : (!isBusy ? 'Create' : 'Creating')}</span>
                {isBusy && <Loader inline size={3} className={styles.busyLoader} />}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default UserManage;
