import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from './ProjectManage.module.css';
import { useHistory } from 'react-router-dom';
import Routes from '../utils/routes';
import UserActions, { UserActionsModes, UserActionsContexts } from './UserActions';
import Button from './common/Button';
import Loader from './common/Loader';
import Scrollable from './common/Scrollable';
import { Bin } from './Icons';
import { confirm } from './common/Confirm';
import { useForm, useField } from 'react-final-form-hooks';
import { Validators, Input, Textarea, Datepicker, Select } from './FormFields';
import { getClients } from '../store/clients/actions';
import { getProject, createProject, updateProject, deleteProject, getProjects } from '../store/projects/actions';
import { getResearchers, refreshAuthorizations } from '../store/users/actions';
import { format } from 'date-fns';
import { UserRoles, hasRoleOnClient, hasRoleOnProject } from '../store';

const ProjectTypes = {
  CommercialTest: 'Commercial Test',
  ConsumerTest: 'Consumer Test',
  CoverTest: 'Cover Test',
  MessagingTest: 'Messaging Test',
  PoliticalAdTest: 'Political Ad Test',
  PrintAdTest: 'Print Ad Test',
  TrailerTest: 'Trailer Test',
  VideoTest: 'Video Test',
  WebsiteEvaluationTest: 'Website Evaluation Test',
  CustomTest: 'Custom Test',
};

const projectTypesOptions = Object.keys(ProjectTypes).map(key => ({
  value: ProjectTypes[key],
  text: ProjectTypes[key],
}));

const ProjectManage = props => {
  const { id, clientId } = props;
  const dispatch = useDispatch();
  const history = useHistory();
  const user = useSelector(state => state.authReducer.user);
  const [canDelete, setCanDelete] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [canCreateUser, setCanCreateUser] = useState(false);
  const editMode = !!id;
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [isDeleteBusy, setIsDeleteBusy] = useState(false);
  const data = useSelector(state =>
    editMode ? state.projectsReducer.projects.filter(p => p.id === id)[0] : null);
  const contacts = useSelector(state => state.usersReducer.researchers);
  const [contactsOptions, setContactsOptions] = useState([]);
  const [contact, setContact] = useState(null);

  useEffect(() => {
    dispatch(getClients()).then(() => {}, () => {});
    dispatch(getResearchers()).then(() => {}, () => {});
  }, []);

  const init = useCallback(() => {
    setIsLoading(true);
    if (!editMode) {
      setCanEdit(true);
      setIsLoading(false);
      return;
    }
    if (id) {
      let project = data;
      let promises = !project ? [
        dispatch(getProject(id)).then((action) => (project = action.payload), () => {}),
      ] : [];
      Promise.all(promises).then(() => {
        if (project) {
          dispatch(getProjects(project.domain_id)).then((action) => {
            let projects = action.payload, authorized = false;
            for (let i = 0; i < projects.length; i++) {
              if (hasRoleOnProject(user.id, projects[i].id, UserRoles.ProjectManager)) {
                authorized = true;
                break;
              }
            }
            setCanDelete(authorized);
            setCanEdit(
              authorized ||
              hasRoleOnClient(user.id, project.domain_id, UserRoles.ClientManager)
            );
            setCanManage(hasRoleOnProject(user.id, id, UserRoles.ProjectAdmin));
            setCanCreateUser(hasRoleOnClient(user.id, project.domain_id, UserRoles.ClientManager));
            setIsLoading(false);
          }, () => {});
        }
      });
    }
  }, [editMode, id, user, data]);

  useEffect(init, [id]);

  useEffect(() => {
    if (contacts) {
      setContactsOptions(contacts.map(contact => ({
        value: contact.id,
        text: contact.email,
      })));
    }
  }, [contacts]);

  const handleDelete = useCallback(() => {
    setIsDeleteBusy(true);
    const parent = data.domain_id;
    dispatch(deleteProject(data.id)).then(() => {
      setIsDeleteBusy(false);
      history.push(Routes.ManageClient.replace(':id', parent));
    }, () => {
      setIsDeleteBusy(false);
    });
  }, [data, history]);

  const { form, handleSubmit, submitting } = useForm({
    initialValues: data ? {
      name: data.name || '',
      project_number: data.project_number || '',
      project_type: data.project_type || '',
      description: data.description || '',
      account_id: +data.account_id || '',
      modified_on: data.modified_on || '',
    } : {
      project_type: ProjectTypes.CommercialTest,
    },
    validate: (values) => {
      let errors = {};
      ['name', 'modified_on'].forEach(key => {
        if (!Validators.hasValue(values[key])) {
          errors[key] = 'Field value is required.';
        }
      });
      return errors;
    },
    onSubmit: (values) => {
      setIsBusy(true);
      const result = {
        name: values.name,
        project_number: values.project_number,
        domain_id: editMode ? data.domain_id : clientId,
        project_type: values.project_type,
        description: values.description,
        account_id: values.account_id,
        phone: contact ? contact.contact_phone : null,
        email: contact ? contact.email : null,
        modified_on: values.modified_on ?
          format(new Date(values.modified_on), 'yyyy-MM-dd')
          : '',
      };
      if (editMode) {
        data && dispatch(updateProject(data.id, result)).then(() => {
          form.reset();
          setIsBusy(false);
        }, () => {
          setIsBusy(false);
        });
      } else {
        dispatch(createProject(result)).then(action => {
          const project = action.payload;
          const handleSuccess = () => {
            setIsBusy(false);
            history.push(Routes.ManageProject.replace(':id', project.id));
          };
          dispatch(refreshAuthorizations('project', project.id, user.id, project.domain_id))
            .then(handleSuccess, handleSuccess);
        }, () => {
          setIsBusy(false);
        });
      }
    },
  });

  const name = useField('name', form);
  const project_number = useField('project_number', form);
  const project_type = useField('project_type', form);
  const description = useField('description', form);
  const account_id = useField('account_id', form);
  const modified_on = useField('modified_on', form);

  const contact_phone = useField('contact_phone', form);
  const contact_email = useField('contact_email', form);

  useEffect(() => {
    let c = contacts.filter(c => c.id === +account_id.input.value)[0];
    setContact(!!c ? { ...c } : null);
  }, [contacts, account_id.input.value]);

  if (isLoading || (editMode && !data)) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader inline className={styles.loader} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.section} ${styles.left}`}>
        <div className={styles.title}>
          <span>Project details</span>
        </div>
        {editMode && (
          <div className={styles.actions}>
            {canDelete && (
              <Button
                transparent
                loading={isDeleteBusy}
                onClick={() => confirm({
                  text: 'Are you sure you want to delete this project ?',
                  onConfirm: handleDelete,
                })}
              >
                <Bin className={styles.deleteIcon} />
                <span>{!isDeleteBusy ? 'Delete project' : 'Deleting project'}</span>
              </Button>
            )}
          </div>
        )}
        <Scrollable className={styles.scrollableForm}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <Input
              className={styles.formControl}
              field={name}
              preview={!canEdit}
              disabled={isBusy}
              label={`Project name ${canEdit ? '*' : ''}`}
            />
            <Input
              className={styles.formControl}
              field={project_number}
              preview={!canEdit}
              disabled={isBusy}
              label="Project #"
            />
            <Select
              className={styles.formControl}
              field={project_type}
              preview={!canEdit}
              options={projectTypesOptions}
              disabled={isBusy}
              placeholder={editMode ? 'UNASSIGNED' : 'Select a project type...'}
              label={`Project type ${canEdit ? '*' : ''}`}
            />
            <Textarea
              className={styles.formControl}
              field={description}
              preview={!canEdit}
              disabled={isBusy}
              label="Description"
            />
            <Select
              className={styles.formControl}
              field={account_id}
              preview={!canEdit}
              options={contactsOptions}
              disabled={isBusy}
              placeholder={editMode ? 'UNASSIGNED' : 'Select a research contact...'}
              label="Research contact"
            />
            {!!contact && (<>
              <Input
                className={styles.formControl}
                field={contact_phone}
                preview={true}
                value={!!contact ? contact.contact_phone : ''}
                label="Phone"
              />
              <Input
                className={styles.formControl}
                field={contact_email}
                preview={true}
                value={!!contact ? contact.email : ''}
                label="Email"
              />
            </>)}
            <Datepicker
              className={styles.formControl}
              field={modified_on}
              preview={!canEdit}
              disabled={isBusy}
              maxToday={true}
              label={`Last modified on ${canEdit ? '*' : ''}`}
            />
            {canEdit && (
              <div className={styles.formButtons}>
                <Button type="submit" disabled={submitting || isBusy} loading={isBusy}>
                  {editMode ? (!isBusy ? 'Update' : 'Updating') : (!isBusy ? 'Create' : 'Creating')}
                </Button>
              </div>
            )}
          </form>
        </Scrollable>
      </div>
      {editMode && canManage && (
        <div className={`${styles.section} ${styles.right}`}>
          <div className={styles.title}>
            <span>Project access</span>
          </div>
          <UserActions
            className={styles.grantActions}
            mode={UserActionsModes.Grant}
            context={UserActionsContexts.Project}
            clientId={data ? data.domain_id : clientId}
            projectId={data.id}
            canCreate={canCreateUser}
          />
        </div>
      )}
    </div>
  );
};

export default ProjectManage;
