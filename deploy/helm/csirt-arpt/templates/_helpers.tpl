{{- define "csirt.labels" -}}
app.kubernetes.io/name: csirt-arpt
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
environment: {{ .Values.environment }}
{{- end }}
