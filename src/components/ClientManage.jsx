import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from './ClientManage.module.css';
import { useHistory } from 'react-router-dom';
import Routes from '../utils/routes';
import Button from './Button';
import Loader from './Loader';
import UserActions, { UserActionsModes, UserActionsContexts } from './UserActions';
import UserManage from './UserManage';
import TemplateActions from './TemplateActions';
import ResourceActions from './ResourceActions';
import DomainActions from './DomainActions';
import Toggle from './Toggle';
import ImageUploading from "react-images-uploading";
import { Bin, Upload } from './Icons';
import { useForm, useField } from 'react-final-form-hooks';
import { Input, Select, Checkbox } from './FormFields';
import { getClient, createClient, updateClient, deleteClient } from '../store/clients/actions';
import { refreshAuthorizations, getUsers } from '../store/users/actions';
import { UserRoles, hasRoleOnClient } from '../store';

const ClientTypes = {
  Client: 'Client',
  Partner: 'Partner',
  Other: 'Other',
};

const clientTypesOptions = Object.keys(ClientTypes).map(key => ({
  value: ClientTypes[key],
  text: ClientTypes[key],
}));

const ContentTabs = {
  Details: 1,
  Accounts: 2,
};

const FieldsTabs = {
  Details: 1,
  Contact: 2,
  Addresses: 3,
};

const AccountsTabs = {
  Users: 1,
  Domains: 2,
  Template: 3,
};

const UsersTabs = {
  Info: 1,
  Permissions: 2,
};

const urlAccountsRegExp = /\/accounts\/([0-9]+)$/;

const ClientManage = props => {
  const { id } = props;
  const dispatch = useDispatch();
  const history = useHistory();
  const user = useSelector(state => state.authReducer.user);
  const [canEdit, setCanEdit] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const editMode = !!id;
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [isDeleteBusy, setIsDeleteBusy] = useState(false);
  const users = useSelector(state => state.usersReducer.users);
  const clients = useSelector(state =>
    editMode ? state.clientsReducer.clients : null);
  const data = useSelector(state =>
    editMode ? state.clientsReducer.clients.filter(c => c.id === id)[0] : null);
  const [avatar, setAvatar] = useState(null);
  const [tab, setTab] = useState(ContentTabs.Details);
  const [fieldsTab, setFieldsTab] = useState(FieldsTabs.Details);
  const [accountsTab, setAccountsTab] = useState(AccountsTabs.Users);
  const [showTemplate, setShowTemplate] = useState(false);
  const [usersTab, setUsersTab] = useState(UsersTabs.Info);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [templateActiveState, setTemplateActiveState] = useState(null);

  const initSelection = useCallback(() => {
    const pathname = history.location.pathname;
    const accountMatch = pathname.match(urlAccountsRegExp);
    if (accountMatch && accountMatch[1].length) {
      const user = users.filter(u => u.id === +accountMatch[1])[0];
      if (tab !== ContentTabs.Accounts) {
        setTab(ContentTabs.Accounts);
      }
      if (user) {
        setSelectedUserId(user.id);
        return;
      }
    }
    setTab(ContentTabs.Details);
    setSelectedUserId(null);
  }, [history.location.pathname, tab, users]);

  const init = useCallback(() => {
    setIsLoading(true);
    setAccountsTab(AccountsTabs.Users);
    setUsersTab(UsersTabs.Info);
    setTemplateActiveState(null);
    if (!editMode) {
      setAvatar(null);
      setTab(ContentTabs.Details);
      setCanEdit(true);
      setIsLoading(false);
      return;
    }
    if (id) {
      let client = data;
      let promises = !client ? [
        dispatch(getClient(id)).then((action) => (client = action.payload), () => {}),
      ] : [];
      initSelection();
      Promise.all(promises).then(() => {
        setCanEdit(hasRoleOnClient(user.id, id, UserRoles.ClientManager));
        setCanManage(hasRoleOnClient(user.id, id, UserRoles.ClientAdmin));
        setIsLoading(false);
      });
    }
  }, [editMode, id, user, initSelection, data]);

  useEffect(() => {
    init();
  }, [id]);

  const handleBreadcrumbsChange = useCallback(() => {
    let bc = tab === ContentTabs.Accounts ? ['Accounts'] : [];
    if (bc.length && selectedUserId) {
      let u = users.filter(u => u.id === selectedUserId)[0];
      if (u) {
        bc.push(u.contact_name || u.email);
      }
    }
    if (props.onBreadcrumbsChange) {
      props.onBreadcrumbsChange(bc);
    }
  }, [tab, users, selectedUserId, props.onBreadcrumbsChange]);

  useEffect(() => {
    if (editMode) {
      handleBreadcrumbsChange();
    }
  }, [editMode, selectedUserId, tab]);

  const handleTabSelect = useCallback((tabId) => {
    const pathname = history.location.pathname;
    if (tabId !== ContentTabs.Accounts && pathname.match(urlAccountsRegExp)) {
      setSelectedUserId(null);
      history.push(`${Routes.ManageClient.replace(':id', id)}`);
    }
    setTab(tabId);
  }, [id, history]);

  const handleTemplateClick = useCallback(() => {
    setSelectedUserId(false);
    setShowTemplate(true);
    history.push(`${Routes.ManageClient.replace(':id', id)}`);
  });

  const handleUserSelect = useCallback((uid) => {
    if (tab === ContentTabs.Accounts && selectedUserId !== uid) {
      setSelectedUserId(uid);
      if (uid) {
        setAccountsTab(AccountsTabs.Users);
        setShowTemplate(false);
        history.push(`${Routes.ManageClientUser.replace(':id', id).replace(':userId', uid)}`);
      }
    }
  }, [id, history, tab, selectedUserId]);

  const handleDelete = useCallback(() => {
    setIsDeleteBusy(true);
    let redirectToId;
    if (clients.length > 1) {
      for (let i = 0; i < clients.length; i++) {
        if (clients[i].id === data.id) {
          redirectToId = clients[i > 0 ? i-1 : i+1].id;
        }
      }
    }
    dispatch(deleteClient(data.id)).then(() => {
      setIsDeleteBusy(false);
      if (redirectToId) {
        history.push(Routes.ManageClient.replace(':id', redirectToId));
      } else {
        history.push(Routes.CreateClient);
      }
    }, () => {
      setIsDeleteBusy(false);
    });
  }, [clients, data, history]);

  const handleAvatarChange = useCallback((images) => {
    if (images && images.length) {
      setAvatar(images[0]);
    } else {
      setAvatar(null);
    }
  });

  const { form, handleSubmit, pristine, submitting } = useForm({
    initialValues: data ? {
      name: data.name || '',
      slogan: data.slogan || '',
      company_name: data.company_name || '',
      contact_type: data.contact_type || '',
      contact_name: data.contact_name || '',
      contact_title: data.contact_title || '',
      contact_phone: data.contact_phone || '',
      contact_fax: data.contact_fax || '',
      contact_email: data.contact_email || '',
      mailing_address_1: data.mailing_address_1 || '',
      mailing_city: data.mailing_city || '',
      mailing_zip: data.mailing_zip || '',
      mailing_state: data.mailing_state || '',
      mailing_country: data.mailing_country || '',
      billing_address_1: data.billing_address_1 || '',
      billing_city: data.billing_city || '',
      billing_zip: data.billing_zip || '',
      billing_state: data.billing_state || '',
      billing_country: data.billing_country || '',
    } : {},
    validate: (values) => {
      let errors = {};
      [
        'name', 'company_name', 'contact_type',
        'contact_name', 'contact_phone', 'contact_email',
        'mailing_address_1', 'mailing_city', 'mailing_zip', 'mailing_state',
        'billing_address_1', 'billing_city', 'billing_zip', 'billing_state',
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
        name: values.name,
        slogan: values.slogan,
        company_name: values.company_name,
        contact_type: values.contact_type,
        contact_name: values.contact_name,
        contact_title: values.contact_title,
        contact_phone: values.contact_phone,
        contact_fax: values.contact_fax,
        contact_email: values.contact_email,
        mailing_address_1: values.mailing_address_1,
        mailing_city: values.mailing_city,
        mailing_zip: values.mailing_zip,
        mailing_state: values.mailing_state,
        mailing_country: values.mailing_country,
        billing_address_1: values.billing_address_1,
        billing_city: values.billing_city,
        billing_zip: values.billing_zip,
        billing_state: values.billing_state,
        billing_country: values.billing_country,
      };
      if (avatar) {
        result.logo = avatar.dataURL;
      }
      if (editMode) {
        data && dispatch(updateClient(data.id, result)).then(() => {
          form.reset();
          setIsBusy(false);
        }, () => {
          setIsBusy(false);
        });
      } else {
        dispatch(createClient(result)).then(action => {
          const client = action.payload;
          Promise.all([
            dispatch(refreshAuthorizations('client', client.id, user.id, client.id))
              .then(() => {}, () => {}),
            dispatch(getUsers(client.id, true))
              .then(() => {}, () => {}),
          ]).then(() => {
            setIsBusy(false);
            history.push(Routes.ManageClient.replace(':id', client.id));
          });
        }, () => {
          setIsBusy(false);
        });
      }
    },
  });

  const name = useField('name', form);
  const slogan = useField('slogan', form);
  const company_name = useField('company_name', form);
  const contact_type = useField('contact_type', form);

  const contact_name = useField('contact_name', form);
  const contact_title = useField('contact_title', form);
  const contact_phone = useField('contact_phone', form);
  const contact_fax = useField('contact_fax', form);
  const contact_email = useField('contact_email', form);

  const mailing_address_1 = useField('mailing_address_1', form);
  const mailing_city = useField('mailing_city', form);
  const mailing_zip = useField('mailing_zip', form);
  const mailing_state = useField('mailing_state', form);
  const mailing_country = useField('mailing_country', form);

  const billing_as_mailing = useField('billing_as_mailing', form);
  const billing_address_1 = useField('billing_address_1', form);
  const billing_city = useField('billing_city', form);
  const billing_zip = useField('billing_zip', form);
  const billing_state = useField('billing_state', form);
  const billing_country = useField('billing_country', form);

  const [billingAsMailing, setBillingAsMailing] = useState(false);
  const [billingDefaults, setBillingDefaults] = useState({});
  
  useEffect(() => {
    setBillingDefaults(data ? {
      billing_address_1: data.billing_address_1 || '',
      billing_city: data.billing_city || '',
      billing_zip: data.billing_zip || '',
      billing_state: data.billing_state || '',
      billing_country: data.billing_country || '',
    } : {});
  }, [data]);

  useEffect(() => {
    const status = billing_as_mailing.input.value;
    if (status) {
      setBillingDefaults({
        billing_address_1: billing_address_1.input.value,
        billing_city: billing_city.input.value,
        billing_zip: billing_zip.input.value,
        billing_state: billing_state.input.value,
        billing_country: billing_country.input.value,
      });
    }
    setBillingAsMailing(!!status);
  }, [billing_as_mailing.input.value]);

  const getTemplateStatus = useCallback(() => {
    if (templateActiveState === true || templateActiveState === false) {
      return templateActiveState;
    }
    return data ? !!data.default_template_enabled : false;
  }, [templateActiveState, data]);

  const setTemplateStatus = useCallback((status) => {
    setTemplateActiveState(status);
    dispatch(updateClient(id, { default_template_enabled: status }))
      .then(() => {}, () => {});
  }, [id]);

  return (!editMode || data) ? (
    <div className={`${styles.container} ${!editMode ? styles.noTabs : ''}`}>
      {editMode && (
        <div className={styles.tabs}>
          <div
            className={`${styles.tab} ${tab === ContentTabs.Details ? styles.active : ''}`}
            onClick={() => handleTabSelect(ContentTabs.Details)}
          >
            <span>Client details</span>
          </div>
          {editMode && canEdit && (
            <div
              className={`${styles.tab} ${tab === ContentTabs.Accounts ? styles.active : ''}`}
              onClick={() => handleTabSelect(ContentTabs.Accounts)}
            >
              <span>Accounts</span>
            </div>
          )}
        </div>
      )}
      {isLoading ? (
        <div className={styles.section}>
          <Loader inline className={styles.loader} />
        </div>
      ) : (<>
      {(tab === ContentTabs.Details && (
        <div className={`${styles.section} ${styles.details}`}>
          {!editMode && (
            <div className={styles.navigate}>
              <div className={`${styles.title} ${styles.big}`}>
                <span>Create new client</span>
              </div>
              <div className={`${styles.textBlock} ${styles.tall}`}>
                Follow the steps below in order to create a new client.
              </div>
              <div className={styles.navigateLinks}>
                <div className={fieldsTab >= FieldsTabs.Details ? styles.active : ''}>
                  <span onClick={() => setFieldsTab(FieldsTabs.Details)}>1. Client details</span>
                </div>
                <div className={fieldsTab >= FieldsTabs.Contact ? styles.active : ''}>
                  <span onClick={() => setFieldsTab(FieldsTabs.Contact)}>2. Primary contact</span>
                </div>
                <div className={fieldsTab >= FieldsTabs.Addresses ? styles.active : ''}>
                  <span onClick={() => setFieldsTab(FieldsTabs.Addresses)}>3. Addresses</span>
                </div>
              </div>
            </div>
          )}
          <div className={`${styles.editor} ${!editMode ? styles.sectioned : ''}`}>
            <form className={styles.form} onSubmit={handleSubmit}>
              {editMode && (
                <div className={styles.actions}>
                  {canEdit && (
                    <Button transparent onClick={handleDelete} loading={isDeleteBusy}>
                      <Bin className={styles.deleteIcon} />
                      <span>{!isDeleteBusy ? 'Delete client' : 'Deleting client'}</span>
                    </Button>
                  )}
                </div>
              )}
              {(editMode || fieldsTab === FieldsTabs.Details) && (<>
                <div className={styles.formSection}>
                  {editMode ? (
                    <div className={styles.title}>
                      <span>Name and type</span>
                    </div>
                  ) : (
                    <ImageUploading onChange={handleAvatarChange}>
                      {({ onImageUpload }) => (
                        <div className={styles.avatar}>
                          <span className={styles.avatarLabel}>Upload photo</span>
                          <div
                            className={`${styles.avatarUpload} ${!!avatar ? styles.hasAvatar : ''}`}
                            onClick={onImageUpload}
                          >
                            {!!avatar && <img src={avatar.dataURL} />}
                            <div className={styles.uploadOverlay}></div>
                            <div className={styles.uploadTrigger}><Upload /></div>
                          </div>
                        </div>
                      )}
                    </ImageUploading>
                  )}
                  <div className={styles.controlsGroup}>
                    <Input
                      className={styles.formControl}
                      field={name}
                      preview={!canEdit}
                      disabled={isBusy}
                      label={`Client name ${canEdit ? '*' : ''}`}
                    />
                    <Input
                      className={styles.formControl}
                      field={company_name}
                      preview={!canEdit}
                      disabled={isBusy}
                      label={`Company name ${canEdit ? '*' : ''}`}
                    />
                  </div>
                  <Input
                    className={styles.formControl}
                    field={slogan}
                    preview={!canEdit}
                    disabled={isBusy}
                    label="Slogan"
                  />
                  <Select
                    className={styles.formControl}
                    field={contact_type}
                    preview={!canEdit}
                    options={clientTypesOptions}
                    disabled={isBusy}
                    placeholder={editMode ? 'UNASSIGNED' : 'Contact type...'}
                    label={`Client type ${canEdit ? '*' : ''}`}
                  />
                </div>
                {!editMode && (
                  <div className={styles.formButtons}>
                    <Button disabled={submitting || isBusy} onClick={() => setFieldsTab(FieldsTabs.Contact)}>
                      <span>Continue</span>
                    </Button>
                  </div>
                )}
              </>)}
              {(editMode || fieldsTab === FieldsTabs.Contact) && (<>
                <div className={styles.formSection}>
                  {editMode && (
                    <div className={styles.title}>
                      <span>Primary contact</span>
                    </div>
                  )}
                  <div className={styles.controlsGroup}>
                    <Input
                      className={styles.formControl}
                      field={contact_name}
                      preview={!canEdit}
                      disabled={isBusy}
                      label={`Name ${canEdit ? '*' : ''}`}
                    />
                    <Input
                      className={styles.formControl}
                      field={contact_title}
                      preview={!canEdit}
                      disabled={isBusy}
                      label="Title"
                    />
                  </div>
                  <div className={styles.controlsGroup}>
                    <Input
                      className={styles.formControl}
                      field={contact_phone}
                      preview={!canEdit}
                      disabled={isBusy}
                      label={`Phone number ${canEdit ? '*' : ''}`}
                    />
                    <Input
                      className={styles.formControl}
                      field={contact_fax}
                      preview={!canEdit}
                      disabled={isBusy}
                      label="Fax number"
                    />
                  </div>
                  <Input
                    className={styles.formControl}
                    field={contact_email}
                    preview={!canEdit}
                    disabled={isBusy}
                    label={`Email ${canEdit ? '*' : ''}`}
                  />
                </div>
                {!editMode && (
                  <div className={styles.formButtons}>
                    <Button disabled={submitting || isBusy} onClick={() => setFieldsTab(FieldsTabs.Addresses)}>
                      <span>Continue</span>
                    </Button>
                  </div>
                )}
              </>)}
              {(editMode || fieldsTab === FieldsTabs.Addresses) && (<>
                <div className={`${styles.formSection} ${styles.addressFields}`}>
                  <div className={styles.controlsGroup}>
                    <div>
                      <div className={`${styles.title} ${canEdit ? styles.mailing : ''}`}>
                        <span>Mailing address</span>
                      </div>
                      <Input
                        className={styles.formControl}
                        field={mailing_address_1}
                        preview={!canEdit}
                        disabled={isBusy}
                        label={`Address ${canEdit ? '*' : ''}`}
                      />
                      <Input
                        className={styles.formControl}
                        field={mailing_city}
                        preview={!canEdit}
                        disabled={isBusy}
                        label={`City ${canEdit ? '*' : ''}`}
                      />
                      <Input
                        className={styles.formControl}
                        field={mailing_state}
                        preview={!canEdit}
                        disabled={isBusy}
                        label={`State ${canEdit ? '*' : ''}`}
                      />
                      <Input
                        className={styles.formControl}
                        field={mailing_zip}
                        preview={!canEdit}
                        disabled={isBusy}
                        label={`Zip code ${canEdit ? '*' : ''}`}
                      />
                      <Input
                        className={styles.formControl}
                        field={mailing_country}
                        preview={!canEdit}
                        disabled={isBusy}
                        label="Country"
                      />
                    </div>
                    <div>
                      <div className={styles.title}>
                        <span>Billing address</span>
                      </div>
                      <Checkbox
                        className={styles.formControl}
                        field={billing_as_mailing}
                        preview={!canEdit}
                        disabled={isBusy}
                        label="Same as the mailing address"
                      />
                      <Input
                        className={styles.formControl}
                        field={billing_address_1}
                        preview={!canEdit}
                        disabled={isBusy || billingAsMailing}
                        value={billingAsMailing ? mailing_address_1.input.value : (billingDefaults.billing_address_1 || '')}
                        label={`Address ${canEdit ? '*' : ''}`}
                      />
                      <Input
                        className={styles.formControl}
                        field={billing_city}
                        preview={!canEdit}
                        disabled={isBusy || billingAsMailing}
                        value={billingAsMailing ? mailing_city.input.value : (billingDefaults.billing_city || '')}
                        label={`City ${canEdit ? '*' : ''}`}
                      />
                      <Input
                        className={styles.formControl}
                        field={billing_state}
                        preview={!canEdit}
                        disabled={isBusy || billingAsMailing}
                        value={billingAsMailing ? mailing_state.input.value : (billingDefaults.billing_state || '')}
                        label={`State ${canEdit ? '*' : ''}`}
                      />
                      <Input
                        className={styles.formControl}
                        field={billing_zip}
                        preview={!canEdit}
                        disabled={isBusy || billingAsMailing}
                        value={billingAsMailing ? mailing_zip.input.value : (billingDefaults.billing_zip || '')}
                        label={`Zip code ${canEdit ? '*' : ''}`}
                      />
                      <Input
                        className={styles.formControl}
                        field={billing_country}
                        preview={!canEdit}
                        disabled={isBusy || billingAsMailing}
                        value={billingAsMailing ? mailing_country.input.value : (billingDefaults.billing_country || '')}
                        label="Country"
                      />
                    </div>
                  </div>
                </div>
                {canEdit && (
                  <div className={styles.formButtons}>
                    <Button type="submit" disabled={submitting || isBusy} loading={isBusy}>
                      {editMode ? (!isBusy ? 'Update' : 'Updating') : (!isBusy ? 'Done' : 'Creating')}
                    </Button>
                  </div>
                )}
              </>)}
            </form>
          </div>
          {editMode && canManage && (
            <div className={styles.grant}>
              <div className={`${styles.title} ${styles.big}`}>
                <span>Client access</span>
              </div>
              <UserActions
                mode={UserActionsModes.Grant}
                context={UserActionsContexts.Client}
                clientId={id}
              />
            </div>
          )}
        </div>
      )) ||
      (tab === ContentTabs.Accounts && (
        <div className={`${styles.section} ${styles.accounts}`}>
          <div className={styles.userList}>
            <div className={styles.accountsTabs}>
              <div className={`${styles.innerTabs} ${styles.stretch}`}>
                <div
                  className={`
                    ${styles.innerTab}
                    ${accountsTab === AccountsTabs.Users ? styles.active : ''}
                  `}
                  onClick={() => {
                    setAccountsTab(AccountsTabs.Users);
                    setShowTemplate(false);
                    setSelectedUserId(null);
                  }}
                >
                  <span>Users</span>
                </div>
                <div
                  className={`${styles.innerTab} ${accountsTab === AccountsTabs.Domains ? styles.active : ''}`}
                  onClick={() => setAccountsTab(AccountsTabs.Domains)}
                >
                  <span>Domains</span>
                </div>
              </div>
              {canManage && accountsTab !== AccountsTabs.Domains && (
                <div className={`${styles.template} ${showTemplate ? styles.active : ''}`}>
                  <span onClick={handleTemplateClick}>User Template</span>
                </div>
              )}
            </div>
            {(accountsTab === AccountsTabs.Users && (
              <UserActions
                mode={UserActionsModes.Manage}
                showClients={false}
                limitClientId={id}
                selectedUserId={selectedUserId}
                onUserSelect={handleUserSelect}
              />
            )) ||
            (accountsTab === AccountsTabs.Domains && (
              <DomainActions clientId={id} />
            ))}
          </div>
          {(accountsTab === AccountsTabs.Users && !showTemplate && (
            <div className={styles.userActions}>
              <div className={styles.innerTabs}>
                <div
                  className={`${styles.innerTab} ${usersTab === UsersTabs.Info ? styles.active : ''}`}
                  onClick={() => setUsersTab(UsersTabs.Info)}
                >
                  <span>User info</span>
                </div>
                {canManage && (
                  <div
                    className={`${styles.innerTab} ${usersTab === UsersTabs.Permissions ? styles.active : ''}`}
                    onClick={() => setUsersTab(UsersTabs.Permissions)}
                  >
                    <span>Access and Permissions</span>
                  </div>
                )}
              </div>
              <div className={`
                ${styles.innerContent}
                ${usersTab === UsersTabs.Info || selectedUserId === null ? styles.spaced : ''}
              `}>
                {(usersTab === UsersTabs.Info && (
                  selectedUserId !== null && (
                    <UserManage
                      id={selectedUserId}
                      clientId={editMode ? id : null}
                      preview={true}
                      embeded={true}
                    />
                  )
                )) ||
                (usersTab === UsersTabs.Permissions && (
                  selectedUserId !== null && (
                    <ResourceActions clientId={id} userId={selectedUserId} />
                  )
                ))}
                {selectedUserId === null && (
                  <div className={styles.noUser}>No selected user</div>
                )}
              </div>
            </div>
          )) ||
          (accountsTab === AccountsTabs.Domains && (
            <div className={styles.anyActions}>
              <div className={styles.textBlock}>
                {'By adding a new domain you allow all users from that domain to authenticate as a '}
                <span>{data.name}</span>
                {' user and inherit the default user permissions.'}
              </div>
            </div>
          )) ||
          (showTemplate && (
            <div className={styles.anyActions}>
              <div className={`${styles.title} ${styles.big}`}>
                <span>Template</span>
              </div>
              <div className={`${styles.textBlock} ${styles.split}`}>
                <div className={styles.left}>
                  {'By activating the user template you will be able to '}
                  {'set a default access for your new users.'}
                </div>
                <div className={styles.right}>
                  <Toggle
                    id={`templates-toggle-${id}`}
                    checked={getTemplateStatus()}
                    onChange={status => setTemplateStatus(status)}
                  />
                </div>
              </div>
              <TemplateActions clientId={id} />
            </div>
          ))}
        </div>
      ))}
      </>)}
    </div>
  ) : '';
};

export default ClientManage;
