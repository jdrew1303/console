import React, { PropTypes } from 'react'
import Relay from 'react-relay'
import Loading from '../../../components/Loading/Loading'
import FieldPopup from './FieldPopup'
import UpdateFieldDescriptionMutation from 'mutations/UpdateFieldDescriptionMutation'
import DeleteFieldMutation from 'mutations/DeleteFieldMutation'
import Icon from 'components/Icon/Icon'
import classes from './Field.scss'

class Field extends React.Component {

  static propTypes = {
    field: PropTypes.object.isRequired,
    allModels: PropTypes.array.isRequired,
    params: PropTypes.object.isRequired,
    model: PropTypes.object.isRequired,
  }

  state = {
    editDescription: false,
    editDescriptionPending: false,
    showPopup: false,
  }

  _save () {
    this.refs.details.refs.component.save()
  }

  _delete () {
    if (window.confirm(`Do you really want to delete "${this.props.field.fieldName}"?`)) {
      Relay.Store.commitUpdate(new DeleteFieldMutation({
        fieldId: this.props.field.id,
        modelId: this.props.model.id,
      }), {
        onSuccess: () => {
          analytics.track('models/fields: deleted field', {
            project: this.props.params.projectName,
            model: this.props.params.modelName,
            field: this.props.field.fieldName,
          })
        },
      })
    }
  }

  _saveDescription (e) {
    const description = e.target.value
    if (this.props.field.description === description) {
      this.setState({ editDescription: false })
      return
    }

    this.setState({ editDescriptionPending: true })

    Relay.Store.commitUpdate(new UpdateFieldDescriptionMutation({
      fieldId: this.props.field.id,
      description,
    }), {
      onFailure: () => {
        this.setState({
          editDescription: false,
          editDescriptionPending: false,
        })
      },
      onSuccess: () => {
        analytics.track('models/fields: edited description')

        this.setState({
          editDescription: false,
          editDescriptionPending: false,
        })
      },
    })
  }

  _showPopup () {
    this.setState({ showPopup: true })
  }

  _renderDescription () {
    if (this.state.editDescriptionPending) {
      return (
        <Loading color='#B9B9C8' />
      )
    }

    if (this.state.editDescription) {
      return (
        <input
          autoFocus
          type='text'
          placeholder='Description'
          defaultValue={this.props.field.description}
          onBlur={::this._saveDescription}
          onKeyDown={(e) => e.keyCode === 13 ? e.target.blur() : null}
        />
      )
    }

    if (!this.props.field.description) {
      return (
        <span
          className={classes.addDescription}
          onClick={() => this.setState({ editDescription: true })}
        >
          Add description
        </span>
      )
    }

    return (
      <span
        className={classes.descriptionText}
        onClick={() => this.setState({ editDescription: true })}
      >
        {this.props.field.description}
      </span>
    )
  }

  render () {
    const { field } = this.props

    let type = field.typeIdentifier
    if (field.isList) {
      type = `[${type}]`
    }
    if (field.isRequired) {
      type = `${type}!`
    }

    return (
      <div className={classes.row}>
        {this.state.showPopup &&
          <FieldPopup
            field={field}
            close={() => this.setState({ showPopup: false })}
            params={this.props.params}
            model={this.props.model}
            allModels={this.props.allModels}
          />
        }
        <div className={classes.fieldName} onClick={::this._showPopup}>{field.fieldName}</div>
        <div className={classes.type} onClick={::this._showPopup}>
          <span>{type}</span>
        </div>
        <div className={classes.description}>
          {this._renderDescription()}
        </div>
        <div className={classes.constraints}></div>
        <div className={classes.permissions}>
          {field.permissions.edges.map(({ node }) => (
            <span key={node.id}>{node.userType}</span>
          ))}
        </div>
        <div className={classes.controls}>
          <span onClick={::this._showPopup}>
            <Icon
              width={20}
              height={20}
              src={require('assets/icons/edit.svg')}
            />
          </span>
          <span onClick={::this._delete}>
            <Icon
              width={20}
              height={20}
              src={require('assets/icons/delete.svg')}
            />
          </span>
        </div>
      </div>
    )
  }
}

export default Relay.createContainer(Field, {
  fragments: {
    field: () => Relay.QL`
      fragment on Field {
        id
        fieldName
        typeIdentifier
        isRequired
        isList
        description
        permissions(first: 100) {
          edges {
            node {
              id
              userType
              comment
            }
          }
        }
        ${FieldPopup.getFragment('field')}
      }
    `,
  },
})
