---
layout: post
title: Passenger/PostgreSQL/Postfix on Rails
excerpt: Como configurar un servidor Ubuntu 8.04 desde cero para Ruby on Rails.
---

Llevo usando esta configuración durante bastante tiempo, y me sigue funcionando
de maravilla. La comparto para quien le pueda servir, ya que aunque ahora es
más fácil, al principio no lo fue tanto :)

Todo esto yo lo hago tal cual en un "slice" de [SliceHost][1] con Ubuntu 8.04,
pero seguro que funciona con pocas modificaciones dentro de otros ambientes.

Primero lo básico
-----------------
Después de finalizar la instalación de Ubuntu (o la creación del "slice"),
entramos con el usuario _root_. Aparentemente, en SliceHost hay que configurar
el idioma porque si no vamos a ver varios errores extraños:

En el archivo /etc/environment hay que agregar:

{% highlight bash %}
LANG=en_US.utf8
{% endhighlight %}

Luego ejecutamos:

{% highlight bash %}
$ locale-gen en_US.UTF-8
$ update-locale LANG=en_US.UTF-8
{% endhighlight %}

Ahora agregamos un usuario "normal", y permitimos que use *sudo*:

{% highlight bash %}
$ adduser miusuario
$ EDITOR=/usr/bin/vim visudo
{% endhighlight %}

> Cuando tienes cientos de cuentas que recordar (y por supuesto no usamos la misma
> clave para todas, ¿¡verdad!?), recomiendo [LastPass][lastpass] o [KeePass][keepass].

Cuando ejecutamos _visudo_, se abre el archivo _/etc/sudoers_ que es donde
especificamos que usuarios tienen permiso a usar _sudo_. Uso la variable _EDITOR_
porque de lo contrario _visudo_ se abre con _vi_, y a veces funciona medio extraño...

En el editor, tenemos dos opciones, agregar el usuario o un grupo especial.
Si agregamos el usuario, añadiriamos una linea así:

{% highlight bash %}
miusuario ALL=(ALL) ALL
{% endhighlight %}

Para aprender más sobre este archivo, puedes revisar _man sudoers_
(o [revisa este tutorial][2]). La otra forma es usar un grupo en lugar de un usuario:

{% highlight bash %}
%admin ALL=(ALL) ALL
{% endhighlight %}

Y luego agregamos el usuario al grupo _admin_:

{% highlight bash %}
$ adduser miusuario admin
{% endhighlight %}

Ya que configuramos un usuario con el que trabajaremos siempre, desactivemos
la opción que permite al usuario _root_ iniciar sesión via SSH. Editamos
el archivo _/etc/ssh/sshd\_config_ y buscamos la siguiente linea:

{% highlight bash %}
PermitRootLogin yes
{% endhighlight %}

> **Tip:** En tu máquina de desarrollo, edita _~/.ssh/config_ y agrega esto:
>
>     Host HOSTYDOMINIO_O_IP_DEL_SERVIDOR
>     User miusuario
>
> Luego ejecuta:
>
>     $ ssh-keygen # Si es que aún no tienes tu par de llaves RSA
>     $ ssh-copy-id -i ~/.ssh/id_rsa.pub HOSTYDOMINIO_O_IP_DEL_SERVIDOR
>
> Con esto puedes iniciar una sesión SSH sin especificar contraseña ni usuario.

Simplemente hay que cambiar _yes_ por _no_. Reiniciamos el servicio SSH
(_/etc/init.d/ssh restart_), y antes de salir verificamos que podemos abrir
otra sesión SSH con el usuario que creamos (y que podamos usar _sudo_).
Si quedo bien, cerramos la sesión _root_ para continuar con este usuario.

Si tienes un dominio con el que vas a usar el servidor, y el DNS ya configurado,
agrega lo siguiente al archivo _/etc/hosts_:

{% highlight bash %}
IP_PUBLICA NOMBRE_DEL_SERVIDOR.DOMINIO NOMBRE_DEL_SERVIDOR
{% endhighlight %}

Ejemplo:

{% highlight bash %}
67.128.203.13 staging.miaplicacion.com staging
{% endhighlight %}

Antes de continuar, actualizemos e instalemos algunos paquetes:

{% highlight bash %}
$ sudo aptitude update
$ sudo aptitude safe-upgrade
$ sudo aptitude install build-essential
{% endhighlight %}

¡Quieto Nerón!
--------------
Es muy importante tener un muro de fuego que te proteja de ataques externos, así
que creamos el archivo _/etc/iptables.up.rules_ y le ponemos lo siguiente:

{% highlight bash %}
*filter

# Permitir trafico en localhost
-A INPUT -i lo -j ACCEPT
-A INPUT -i ! lo -d 127.0.0.0/8 -j REJECT

# Permitir tráfico de conexiones ya establecidas
-A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Permitir todo el tráfico al exterior
# Tal vez aquí quieras modificarlo para solo permitir los servicios necesarios
-A OUTPUT -j ACCEPT

# Permitir HTTP(S)
-A INPUT -p tcp --dport 80 -j ACCEPT
-A INPUT -p tcp --dport 443 -j ACCEPT

# Permitir SSH
-A INPUT -p tcp -m state --state NEW --dport 22 -j ACCEPT

# Permitir ping
-A INPUT -p icmp -m icmp --icmp-type 8 -j ACCEPT

# Guardar registro de conexiones denegadas
-A INPUT -m limit --limit 5/min -j LOG --log-prefix "iptables denied: " --log-level 7

# Denegar todas las demás conexiones entrantes
-A INPUT -j REJECT
-A FORWARD -j REJECT

COMMIT
{% endhighlight %}

Este es un muro de fuego muy básico pero funcional. De todas formas te recomiendo
aprender un poco más sobre el tema o pedirle a un amigo experto en seguridad que
revise tu configuración.

Ejecutemos el conjunto de reglas para ver si funciona:

{% highlight bash %}
$ sudo iptables-restore < /etc/iptables.up.rules
$ sudo iptables -L # Para ver que se hayan cargado todas
{% endhighlight %}

Ahora, intenta abrir otra sesión SSH para asegurarte que puedas entrar, si no,
vas a tener que entrar via _root_ directamente en el servidor (en SliceHost con su
_consola root_).

Si pudiste entrar, ahora edita el archivo _/etc/network/interfaces_, para que te
quede algo así (lo importante es la línea de _iptables_):

{% highlight bash %}
auto lo
iface lo inet loopback

pre-up iptables-restore /etc/iptables.up.rules

auto eth0
iface eth0 inet static
    # aqui va la configuración de tu NIC principal
{% endhighlight %}

Con esto se activarán las reglas del muro de fuego cada vez que la red se inicie.

Ruby
----

> **Nota:** Ahora ya puedes instalar REE usando un _deb_, pero dejo estas instrucciones
> por si sirven en el futuro; ah, y además creo que no hay paquete para x86\_64)

Ahora vamos a instalar [Ruby Enterprise Edition][ree]. Si lo prefieres, puedes
instalar el Ruby "normal" con _aptitude_, en cuyo caso te saltas este paso.

{% highlight bash %}
# Esto es porque REE necesita Ruby para instalarse...
$ sudo aptitude install ruby irb rdoc ruby1.8-dev libopenssl-ruby libreadline5-dev
$ sudo ln -s /opt/ruby-enterprise-x.x.x-YYYYMMDD /opt/ruby-enterprise
$ sudo echo "export PATH=$PATH:/opt/ruby-enterprise/bin" >> /etc/environment
$ . /etc/environment
# Para que no haya confusiones:
$ sudo aptitude remove ruby ruby1.8
{% endhighlight %}

El crear un vínculo en _/opt/ruby-enterprise_ hacia la versión instalada es para
que sea más sencillo a la hora de actualizar a una nueva versión de REE.

> Aunque podriamos usar _aptitude_, yo prefiero hacerlo manualmente
> (a ver si no me apedrean los debianeros).

Ahora _RubyGems_. Primero descarga la última versión de [rubygems.org][rubygems], y luego:

{% highlight bash %}
$ tar zxf rubygems-*.tgz
$ cd rubygems-*.tgz
$ sudo ruby setup.rb
$ sudo ln -s /usr/bin/gem1.8 /usr/bin/gem
{% endhighlight %}

Después de esto, hay un detalle que involucra en donde instalamos las gemas, porque
si después actualizamos REE, habría que instalar las gemas nuevamente. Podemos cambiar
el directorio donde se instalan las gemas para que sea fuera de _/opt/ruby-enterprise-\*_
(por ejemplo en _/opt/rubygems/_), y así cada vez que actualizemos el vínculo,
siempre tendremos todas las gemas ya instaladas.

Hasta ahora yo he optado por reinstalar las gemas con cada actualización de REE,
y por lo tanto no he investigado como lograr lo que planteo, pero de seguro que
solo se trata de configurar alguna variable de entorno (¿_GEM\_PATH_?). Si alguien
sabe de esto, agradecere la aclaración.

### Gemas

Instalemos algunas gemas necesarias:

{% highlight bash %}
$ sudo gem install rails rake mongrel ruby --no-ri --no-rdoc
{% endhighlight %}

Ahora podemos instalar las gemas que necesitemos para nuestra aplicación usando
_sudo rake gems:install_.

Apache y Passenger
------------------

Vamonos recio porque esto ya se alargo:

{% highlight bash %}
$ sudo aptitude install apache2 apache2-mpm-prefork apache2-prefork-dev
# Opcional, por si necesitas mod_rewrite:
$ sudo a2enmod rewrite
$ sudo mkdir -p /var/www/miaplicacion
$ sudo rm /etc/apache2/sites-available/default /etc/apache/sites-enabled/default
$ sudo touch /etc/apache2/sites-available/miaplicacion
$ sudo a2ensite miaplicacion
{% endhighlight %}

Editamos el archivo _/etc/apache2/sites-available/miaplicacion_:

{% highlight bash %}
# Este es un resumen, ya que hay otras configuraciones que tal vez querrás incluir,
# como mod_rewrite, donde se guarda el registro, etc.
NameVirtualHost *
<VirtualHost *>
  ServerName miaplicacion.com
  # Si vas a usar Capistrano:
  DocumentRoot /var/www/miaplicacion/current/public
  # Si no:
  # DocumentRoot /var/www/miaplicacion/public
</VirtualHost>
{% endhighlight %}

### Passenger

{% highlight bash %}
$ sudo gem install passenger --no-ri --no-rdoc
$ sudo passenger-install-apache2-module
# Sigue las instrucciones, luego (cambia las "x" por la versión de Passenger):
$ sudo echo "LoadModule passenger_module /opt/ruby-enterprise/lib/ruby/gems/1.8/gems/passenger-x.x.x/ext/apache2/mod_passenger.so" > /etc/apache2/mods-available/ruby.load
$ sudo echo "PassengerRoot /opt/ruby-enterprise/lib/ruby/gems/1.8/gems/passenger-x.x.x\n" > /etc/apache2/mods-available/ruby.conf
$ sudo echo "PassengerRuby /opt/ruby-enterprise/bin/ruby\n" >> /etc/apache2/mods-available/ruby.conf
$ sudo a2enmod ruby
{% endhighlight %}

¡Ta-da!

Postfix
-------

Cuando te pregunte, selecciona "Internet Site":

{% highlight bash %}
$ sudo aptitude install postfix
{% endhighlight %}

La siguiente configuración es para que Postfix funcione solo para enviar e-mail
desde _localhost_ únicamente:

{% highlight bash %}
# /etc/postfix/main.cf
myhostname = nullclient.staging.miaplicacion.com
# Comentar las siguientes lineas:
# mydestination
# relayhost
inet_interfaces = loopback-only
local_transport = error: aqui no recibimos correo
{% endhighlight %}

PostgreSQL
----------

{% highlight bash %}
$ sudo aptitude install postgresql
{% endhighlight %}

{% highlight bash %}
# /etc/postgresql/8.3/main/pg_hba.conf
# Agrega estas lineas al final:
local all all trust
local all all 127.0.0.1/32 trust
{% endhighlight %}

{% highlight bash %}
$ sudo /etc/init.d/postgresql-8.3 restart
$ sudo -u postgres createuser -Sdre usuario_deploy
{% endhighlight %}

La última línea es para que el usuario que usemos para desplegar la aplicación
tenga permisos para crear la base de datos.

El pilón: Capistrano
--------------------

{% highlight bash %}
# En el directorio de tu aplicación:
# (primero "sudo gem install capistrano" si no lo tienes instalado)
$ capify .
{% endhighlight %}

{% highlight ruby %}
# config/deploy.rb
require 'erb'

set :stages, %w(production staging)
require 'capistrano/ext/multistage'

default_run_options[:pty] = true

set :application, 'miaplicacion'

set :repository,  "git@github.com:yomero/#{application}.git"

set :deploy_to, "/var/www/#{application}"

set :scm, 'git'
set :branch, 'master'
set :deploy_via, 'remote_cache'
set :git_enable_submodules, 1

after 'deploy:setup' do
  password = ''
  15.times { password << (i = Kernel.rand(62); i += ((i < 10) ? 48 : ((i < 36) ? 55 : 61 ))).chr }
  db_conf = YAML::load(File.read('config/database.example.yml'))[stage.to_s]
  database_configuration = <<-EOF
#{stage}:
  adapter: #{db_conf['adapter']}
  database: #{db_conf['database']}
  username: #{db_conf['username']}
  password: #{password}
  host: #{db_conf['host']}
  encoding: #{db_conf['encoding']}
EOF
  run "mkdir -p #{shared_path}/config"
  put database_configuration, "#{shared_path}/config/database.yml"

  run "createuser -SDR #{db_conf['username']}"
  run "psql -c \"ALTER USER #{db_conf['username']} WITH ENCRYPTED PASSWORD '#{password}';\""
  run "createdb -E #{db_conf['encoding']} #{application}_#{stage}"
  run "psql -c \"GRANT ALL PRIVILEGES ON DATABASE #{db_conf['database']} TO #{db_conf['username']};\""

  restart_apache
end

after 'deploy:symlink' do
  run "ln -nfs #{shared_path}/config/database.yml #{release_path}/config/database.yml"
end

after 'deploy:update_code' do
  deploy.symlink
end

namespace :deploy do
  desc 'Actualizar código, desactivar web, vincular, migrar, reiniciar, reactivar web.'
  task :default do
    transaction do
      update_code
      web.disable
      symlink
      migrate
    end
    restart
    web.enable
  end

  task :start, :roles => :web do
    logger.info 'No disponible para Passenger.'
  end

  desc 'Reiniciar Apache.'
  task :restart_apache, :roles => :web do
    sudo '/etc/init.d/apache2 restart'
  end

  desc 'Reiniciar aplicación.'
  task :restart, :roles => :web do
    run "touch #{release_path}/tmp/restart.txt"
  end

  desc 'Instalar gemas.'
  task :gems_install, :roles => :app do
    run "cd #{current_path} && sudo rake gems:install RAILS_ENV=#{stage}"
  end

  namespace :web do
    desc 'Disable web site'
    task :disable, :roles => :web, :except => { :no_release => true } do
      on_rollback { run "rm #{shared_path}/system/maintenance.html" }

      reason = ENV['REASON']
      deadline = ENV['UNTIL']

      template = File.read(File.join(File.dirname(__FILE__), 'templates', 'maintenance.rhtml'))
      result = ERB.new(template).result(binding)

      put result, "#{shared_path}/system/maintenance.html", :mode => 0644
    end
  end
end
{% endhighlight %}

Si tienen dudas sobre este archivo, mala suerte :P No, no es cierto, con gusto las respondo :)

{% highlight bash %}
$ cap staging deploy && echo "¡Ta-Da!"
{% endhighlight %}

Comentarios finales
-------------------

Hace ya algo de tiempo que probe esta guía, así que puede ser que varias cosas tengan
que cambiar... Pronto voy a configurar otro ambiente _staging_, y entonces
actualizare la guía con lo que aprenda.

Espero que esto te sirva como a mi me ha servido.

¡Hasta la próxima!

[1]: http://slicehost.com "SliceHost"
[2]: http://www.linuxtotal.com.mx/index.php?cont=info_admon_014 "Aprende a usar sudo y configurar /etc/sudoers con este tutorial"
[lastpass]: http://www.lastpass.com/ "Administra tus contraseñas desde Firefox de forma segura"
[keepass]: http://keepass.info/ "Administra tus contraseñas de forma segura en Linux/Mac/Windows"
[ree]: http://www.rubyenterpriseedition.com/ "Ruby Enterprise Edition"
[rubygems]: http://www.rubygems.org/ "RubyGems"
