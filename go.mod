module github.com/stashapp/stash

require (
	github.com/99designs/gqlgen v0.9.0
	github.com/antchfx/htmlquery v1.2.3
	github.com/bmatcuk/doublestar v1.3.1
	github.com/disintegration/imaging v1.6.0
	github.com/go-chi/chi v4.0.2+incompatible
	github.com/golang-migrate/migrate/v4 v4.3.1
	github.com/gorilla/sessions v1.2.0
	github.com/gorilla/websocket v1.4.0
	github.com/h2non/filetype v1.0.8
	github.com/jinzhu/copier v0.0.0-20190924061706-b57f9002281a
	github.com/jmoiron/sqlx v1.2.0
	github.com/json-iterator/go v1.1.9
	github.com/markbates/pkger v0.16.0
	github.com/mattn/go-sqlite3 v1.13.0
	github.com/rs/cors v1.6.0
	github.com/shurcooL/graphql v0.0.0-20181231061246-d48a9a75455f
	github.com/sirupsen/logrus v1.4.2
	github.com/spf13/afero v1.2.0 // indirect
	github.com/spf13/pflag v1.0.3
	github.com/spf13/viper v1.4.0
	github.com/stretchr/testify v1.5.1
	github.com/vektah/gqlparser v1.1.2
	golang.org/x/crypto v0.0.0-20190701094942-4def268fd1a4
	golang.org/x/image v0.0.0-20190118043309-183bebdce1b2
	golang.org/x/net v0.0.0-20200421231249-e086a090c8fd
	gopkg.in/yaml.v2 v2.2.7
)

replace git.apache.org/thrift.git => github.com/apache/thrift v0.0.0-20180902110319-2566ecd5d999

go 1.11
