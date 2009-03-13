---
layout: post
title: Guardar configuraciones en la BD y YAML.
excerpt: Como usar un plugin para guardar la configuración de una aplicación en la base de datos, pero poblarla con configuraciones predeterminadas de un archivo YAML.
---

Yo solia crear configuraciones predeterminadas usando migraciones. Después de agregar más de unas pocas, te das cuenta que no es muy adecuado.

Así que al principio use un *initializer* para crear cada configuración si es que no existia.

Pero después se me ocurrio algo un poco mejor, con un archivo YAML, que además haria más sencillo el tener configuraciones diferentes para cada *environment*.

El plugin que uso para guardar las configuraciones en la base de datos se llama [rails-settings][rsettings].

Después de instalarlo, creo un *initializer* llamado *site\_settings.rb*, con el siguiente código:

{% highlight ruby %}
if Settings.table_exists?
  settings_file = File.read File.join(RAILS_ROOT, 'config', 'site_settings.yml')
  YAML::load(settings_file)[RAILS_ENV].each do |key, val|
    val = eval(val['eval']) if val.kind_of?(Hash) && val['eval']
    Setting[key] = val unless Setting[key]
  end
end
{% endhighlight %}

Lo que pasa aquí es muy simple. Leemos el contenido del archivo *site\_settings.yml*, y trabajamos la sección correspondiente al ambiente actual. Aquí hago algo inusual con *eval*, pero eso lo explico más abajo.

El chiste de esto es que solo va a guardar los valores de las configuraciones que no existan previamente. De este modo no se sobre-escriben los valores cada vez que se reinicia la aplicación, pero si se van a crear los nuevos conforme los vaya agregando al archivo de configuraciones.

Por cierto que el plugin ya tiene la capacidad de trabajar con *defaults*, pero yo no uso esa función porque con mi método las configuraciones son escritas inmediatamente a la base de datos, y así puedo administrarlas fácilmente desde un panel de control.

Pasando al archivo de configuraciones, queda algo así:

{% highlight yaml %}
defaults: &defaults
  email_de_notificaciones: "algun_email@example.com"
  basecamp_api_url: "http://..."
  id_distrito_federal:
    eval: "State.find_by_slug('distrito-federal').id"

production:
  <<: *defaults

staging:
  <<: *defaults
  email_de_notificaciones: "otro_email@example.com"

development:
  <<: *defaults

test:
  <<: *defaults
{% endhighlight %}

Ahora si creo que queda más claro porque lo del *eval* en el *initializer*. Me parece que el código se explica solo, pero si sigo en mi burbuja, pregunta y con gusto explico un poco más.

[rsettings]: http://github.com/Squeegy/rails-settings/tree/master "rails-settings en GitHub"

