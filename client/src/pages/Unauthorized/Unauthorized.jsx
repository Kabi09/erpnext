import RouteMessage from '../../components/RouteMessage/RouteMessage'

export default function Unauthorized() {
  return <RouteMessage title="Access denied" text="Your account does not have access to this page." />
}
